/**
 * Build the homepage background set: convert the archived renders in
 * `exports/images/*.png` into light square WebP thumbnails under
 * `app/assets/showcase/`, which Vite bundles + fingerprints for the intro screen.
 *
 * One-off, re-runnable whenever `exports/images` changes. The output WebP are
 * committed — `exports/` is gitignored, so it isn't deployed.
 *
 * h3-free on purpose (only `sharp` + node builtins): importing `server/utils/*`
 * would drag in h3 and crash under tsx.
 *
 * Usage: pnpm build:showcase
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'exports', 'images')
const OUT_DIR = join(ROOT, 'app', 'assets', 'showcase')

/** Edge of the square WebP, in px — decorative background, kept small on purpose. */
const SIZE = 720
const QUALITY = 72

async function main() {
  const entries = (await readdir(SRC_DIR)).filter(f => f.toLowerCase().endsWith('.png'))
  if (entries.length === 0) {
    console.error(`[showcase] no PNG found in ${SRC_DIR}`)
    process.exit(1)
  }

  // Rebuild from scratch so removed sources never leave stale WebP behind.
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  let total = 0
  for (const file of entries) {
    const out = join(OUT_DIR, `${file.replace(/\.png$/i, '')}.webp`)
    const webp = await sharp(await readFile(join(SRC_DIR, file)))
      .resize(SIZE, SIZE, { fit: 'cover' })
      .webp({ quality: QUALITY })
      .toBuffer()
    await writeFile(out, webp)
    total += webp.byteLength
  }

  console.log(`[showcase] wrote ${entries.length} WebP to ${OUT_DIR} (${(total / 1024 / 1024).toFixed(2)} Mo)`)
}

main().catch((err) => {
  console.error('[showcase] failed:', err)
  process.exit(1)
})
