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
 * the local copy (size diff vs blob) BEFORE deleting anything server-side.
 * Any missing/mismatched local file aborts the whole prune — Blob has no trash.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises'
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
async function fetchBlob(url: string): Promise<Buffer> {
  let res = await fetch(url)
  if (!res.ok && token) {
    res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return Buffer.from(await res.arrayBuffer())
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

  const { blobs: renders } = await list({ prefix: GENERATED_BLOB_PREFIX, limit: 1000 })
  for (const b of renders) {
    const name = b.pathname.slice(GENERATED_BLOB_PREFIX.length)
    const buf = await fetchBlob(b.url)
    await writeFile(join(imagesDir, name), buf)
    console.log(`  ✓ image ${name} (${buf.length} bytes)`)
  }

  const { blobs: leadBlobs } = await list({ prefix: LEADS_BLOB_PREFIX, limit: 1000 })
  const rows: StoredLead[] = []
  for (const b of leadBlobs) {
    const name = b.pathname.slice(LEADS_BLOB_PREFIX.length) // {uuid}-{suffixe}.json
    const buf = await fetchBlob(b.url)
    await writeFile(join(leadsDir, name), buf)
    try {
      rows.push(JSON.parse(buf.toString('utf8')) as StoredLead)
    } catch {
      console.warn(`  ! lead ${name} illisible — ignoré du CSV`)
    }
  }
  await writeFile(resolve('exports/leads.csv'), toCsv(rows))

  console.log(`\n📥 Import : ${renders.length} image(s), ${rows.length} lead(s) → exports/ (+ leads.csv)`)
}

async function localSize(path: string): Promise<number> {
  return stat(path).then(s => s.size).catch(() => -1)
}

/**
 * Guard rail: every render about to be deleted must exist in exports/images/
 * with the exact blob size before del() fires. Downloads what's missing,
 * re-stats everything after write, and aborts the whole prune on any mismatch.
 */
async function archiveAndVerify(stale: StaleImage[]): Promise<void> {
  const imagesDir = resolve('exports/images')
  await mkdir(imagesDir, { recursive: true })

  for (const s of stale) {
    const name = s.pathname.slice(GENERATED_BLOB_PREFIX.length)
    const path = join(imagesDir, name)
    if (await localSize(path) === s.size) {
      console.log(`  ✓ déjà archivé ${name}`)
      continue
    }
    const buf = await fetchBlob(s.url)
    await writeFile(path, buf)
    console.log(`  ⬇ archivé ${name} (${buf.length} bytes)`)
  }

  // Final diff — re-read from disk so a partial write can't slip through.
  const mismatches: string[] = []
  for (const s of stale) {
    const name = s.pathname.slice(GENERATED_BLOB_PREFIX.length)
    if (await localSize(join(imagesDir, name)) !== s.size) mismatches.push(name)
  }
  if (mismatches.length) {
    console.error(`✋ Prune annulé — copie locale absente ou incomplète pour : ${mismatches.join(', ')}`)
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
