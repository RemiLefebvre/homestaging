/**
 * Import the (production) Vercel Blob store to ./exports, and optionally prune
 * heavy renders server-side to free storage. In prod and locally the project
 * points at the SAME Blob store (README) — so this reads whatever store the
 * BLOB_READ_WRITE_TOKEN in your env resolves to.
 *
 * Usage:
 *   pnpm import:prod                     # download renders + leads + leads.csv → exports/
 *   pnpm import:prod --prune             # archive then delete generated/+gallery/ beyond newest 25
 *   pnpm import:prod --prune --keep=50   # ...keep the newest 50 instead
 *
 * `--prune` archives every targeted render into exports/images/ and verifies
 * the local copy (content md5 vs blob etag, size fallback) BEFORE deleting
 * anything server-side. Any mismatch aborts the whole prune — Blob has no trash.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { list } from '@vercel/blob'
import type { StoredLead } from '../shared/types/lead'
import type { StaleImage } from '../server/utils/blob-store'
import { GENERATED_BLOB_PREFIX, LEADS_BLOB_PREFIX, deleteImages, listStaleImages } from '../server/utils/blob-store'

function parseArgs(argv: string[]): Record<string, string | true> {
  const opts: Record<string, string | true> = {}
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const [key, ...rest] = a.slice(2).split('=')
    opts[key!] = rest.length ? rest.join('=') : true
  }
  return opts
}

const token = process.env.BLOB_READ_WRITE_TOKEN

/** Public blobs fetch anonymously; private ones (leads/) need the store token. */
async function fetchBlobResponse(url: string, method = 'GET'): Promise<Response> {
  let res = await fetch(url, { method })
  if (!res.ok && token) {
    res = await fetch(url, { method, headers: { authorization: `Bearer ${token}` } })
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res
}

async function fetchBlob(url: string): Promise<Buffer> {
  return Buffer.from(await (await fetchBlobResponse(url)).arrayBuffer())
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/** Basename of a generated image URL → matches the file written under exports/images/. */
function imageName(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
  } catch {
    return ''
  }
}

function toCsv(rows: StoredLead[]): string {
  const header = ['prenom', 'nom', 'email', 'date', 'image']
  const lines = rows.map(r =>
    [r.firstName, r.lastName, r.email, r.createdAt, imageName(r.imageUrl)].map(csvCell).join(','),
  )
  return `${[header.join(','), ...lines].join('\n')}\n`
}

async function importAll(): Promise<void> {
  const imagesDir = resolve('exports/images')
  const leadsDir = resolve('exports/leads')
  await mkdir(imagesDir, { recursive: true })
  await mkdir(leadsDir, { recursive: true })

  // Idempotent mirror: only write a file when the local copy differs from the
  // blob (content md5 vs etag, size fallback). Unchanged files are left untouched
  // so their mtime stays a reliable "arrived since last import" signal, and we
  // skip re-downloading the whole store on every run.
  const { blobs: renders } = await list({ prefix: GENERATED_BLOB_PREFIX, limit: 1000 })
  let imgNew = 0
  for (const b of renders) {
    const name = b.pathname.slice(GENERATED_BLOB_PREFIX.length)
    const path = join(imagesDir, name)
    if (await matchesBlob(path, b, await blobEtag(b.url))) continue
    const buf = await fetchBlob(b.url)
    await writeFile(path, buf)
    imgNew++
    console.log(`  ⬇ image ${name} (${buf.length} bytes)`)
  }

  const { blobs: leadBlobs } = await list({ prefix: LEADS_BLOB_PREFIX, limit: 1000 })
  const rows: StoredLead[] = []
  let leadNew = 0
  for (const b of leadBlobs) {
    const name = b.pathname.slice(LEADS_BLOB_PREFIX.length) // {uuid}-{suffixe}.json
    const path = join(leadsDir, name)
    // Every lead still feeds leads.csv; an unchanged one is read from disk (no write).
    let buf: Buffer
    if (await matchesBlob(path, b, await blobEtag(b.url))) {
      buf = await readFile(path)
    } else {
      buf = await fetchBlob(b.url)
      await writeFile(path, buf)
      leadNew++
    }
    try {
      rows.push(JSON.parse(buf.toString('utf8')) as StoredLead)
    } catch {
      console.warn(`  ! lead ${name} illisible — ignoré du CSV`)
    }
  }
  await writeFile(resolve('exports/leads.csv'), toCsv(rows))

  console.log(
    `\n📥 Import : ${renders.length} image(s) [${imgNew} nouvelle(s)/màj, ${renders.length - imgNew} inchangée(s)], `
    + `${rows.length} lead(s) [${leadNew} nouveau(x)/màj] → exports/ (+ leads.csv)`,
  )
}

async function localSize(path: string): Promise<number> {
  return stat(path).then(s => s.size).catch(() => -1)
}

async function localMd5(path: string): Promise<string> {
  return readFile(path).then(buf => createHash('md5').update(buf).digest('hex')).catch(() => '')
}

const MD5_RE = /^[0-9a-f]{32}$/

function cleanEtag(raw: string | null): string | null {
  return raw?.replace(/^W\//, '').replaceAll('"', '') || null
}

async function blobEtag(url: string): Promise<string | null> {
  return fetchBlobResponse(url, 'HEAD')
    .then(res => cleanEtag(res.headers.get('etag')))
    .catch(() => null)
}

/**
 * Local copy ⇔ blob content check. The etag is the content MD5 — observed,
 * not documented — so fall back to a size diff when it doesn't look like one
 * (multipart uploads) or when the HEAD failed.
 */
async function matchesBlob(path: string, blob: { size: number }, etag: string | null): Promise<boolean> {
  if (etag && MD5_RE.test(etag)) return await localMd5(path) === etag
  return await localSize(path) === blob.size
}

/**
 * Guard rail: every render about to be deleted must exist in exports/images/
 * with content matching the blob before del() fires. Downloads what's missing
 * or stale, re-reads from disk after write, aborts the whole prune on any mismatch.
 */
async function archiveAndVerify(stale: StaleImage[]): Promise<void> {
  const imagesDir = resolve('exports/images')
  await mkdir(imagesDir, { recursive: true })

  const etags = new Map<string, string | null>()

  for (const s of stale) {
    const name = s.pathname.slice(GENERATED_BLOB_PREFIX.length)
    const path = join(imagesDir, name)
    let etag = await blobEtag(s.url)
    if (await matchesBlob(path, s, etag)) {
      etags.set(s.pathname, etag)
      console.log(`  ✓ déjà archivé ${name}`)
      continue
    }
    const res = await fetchBlobResponse(s.url)
    etag = cleanEtag(res.headers.get('etag')) ?? etag
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(path, buf)
    etags.set(s.pathname, etag)
    console.log(`  ⬇ archivé ${name} (${buf.length} bytes)`)
  }

  // Final diff — re-read from disk so a partial write can't slip through.
  const mismatches: string[] = []
  for (const s of stale) {
    const name = s.pathname.slice(GENERATED_BLOB_PREFIX.length)
    if (!await matchesBlob(join(imagesDir, name), s, etags.get(s.pathname) ?? null)) mismatches.push(name)
  }
  if (mismatches.length) {
    console.error(`✋ Prune annulé — copie locale absente ou différente du blob pour : ${mismatches.join(', ')}`)
    console.error('   Rien n\'a été supprimé côté serveur.')
    process.exit(1)
  }
}

async function main(): Promise<void> {
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN manquant. Lance `vercel env pull` ou renseigne .env.')
    process.exit(1)
  }

  const opts = parseArgs(process.argv.slice(2))

  if (opts.prune) {
    const keep = typeof opts.keep === 'string' ? Number(opts.keep) : undefined
    const stale = await listStaleImages({ keep })
    if (!stale.length) {
      console.log('🧹 Rien à élaguer : le store est sous le plafond.')
      return
    }

    console.log(`🗂  ${stale.length} rendu(s) à élaguer — archivage local avant suppression…`)
    await archiveAndVerify(stale)

    const { deleted } = await deleteImages(stale)
    console.log(`🧹 Prune : ${deleted} rendu(s) supprimé(s) côté serveur, tous archivés dans exports/images/ (leads conservés).`)
    return
  }

  await importAll()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
