import { randomUUID } from 'node:crypto'
import { del, list, put } from '@vercel/blob'
import sharp from 'sharp'
import { extensionForMime, type OutputMime, validateOutputImage } from './image'

/**
 * Vercel Blob prefix under which generated houses are stored. Keeping a stable
 * prefix lets the gallery endpoint list ONLY our images (in case other features
 * later write blobs of their own).
 */
export const GENERATED_BLOB_PREFIX = 'generated/'

/**
 * Prefix for the small decorative thumbnails shown as the homepage background.
 * Full-res renders (~2MB PNG) are far too heavy to serve 12+ at a time, so the
 * gallery lists these ~512px WebP versions instead — a ~40x smaller transfer.
 */
export const GALLERY_BLOB_PREFIX = 'gallery/'

/** Edge of the square gallery thumbnail, in px. */
const THUMB_SIZE = 512

/**
 * Hard cap on how many full-res renders we keep in Blob. Nothing reads them back
 * except the gallery (newest 12), yet each generation adds ~2MB forever, so we
 * prune the oldest beyond this cap on every save. Override via MAX_STORED_IMAGES.
 */
const MAX_STORED_IMAGES = Number(process.env.MAX_STORED_IMAGES) || 25

/**
 * Persist a generated image to Vercel Blob (read-write storage that works in
 * Vercel serverless functions — the local filesystem is read-only at runtime).
 *
 * Requires `BLOB_READ_WRITE_TOKEN` in the environment. In production, Vercel
 * injects it automatically when a Blob store is linked to the project. Locally,
 * use `vercel env pull` (or set it manually in `.env`).
 */
export async function saveGeneratedImage(
  buffer: Buffer,
): Promise<{ url: string; mimeType: OutputMime }> {
  const mime = validateOutputImage(buffer)
  const ext = extensionForMime(mime)
  const id = randomUUID()

  const blob = await put(`${GENERATED_BLOB_PREFIX}${id}.${ext}`, buffer, {
    access: 'public',
    contentType: mime,
    // We mint our own UUID — don't let the SDK append its own random suffix.
    addRandomSuffix: false,
  })

  // Decorative-only: never let a thumbnail failure break the user's render.
  await saveGalleryThumb(id, buffer).catch((err) => {
    console.error(`[gallery] thumbnail failed for ${id}:`, err)
  })

  // Best-effort storage cap: pruning runs after the new blob is written (so the
  // fresh render always survives) and must never break the user's render.
  await pruneOldImages().catch((err) => {
    console.error('[storage] prune failed:', err)
  })

  return { url: blob.url, mimeType: mime }
}

/**
 * Enforce MAX_STORED_IMAGES by deleting the oldest renders once the cap is
 * exceeded. Keyed off the `generated/` list (the source of truth for a house);
 * the matching gallery thumbnail is found by reusing the same UUID, so a single
 * list() + del() cover both prefixes with no separate metadata store.
 */
async function pruneOldImages(): Promise<void> {
  const { blobs } = await list({ prefix: GENERATED_BLOB_PREFIX, limit: 1000 })
  if (blobs.length <= MAX_STORED_IMAGES) return

  const stale = [...blobs]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(MAX_STORED_IMAGES)

  // Each stale render + its thumbnail (same UUID under the gallery/ prefix).
  const toDelete = stale.flatMap((b) => {
    const id = b.pathname.slice(GENERATED_BLOB_PREFIX.length).replace(/\.[^.]+$/, '')
    return [b.pathname, `${GALLERY_BLOB_PREFIX}${id}.webp`]
  })

  await del(toDelete)
}

/** Write a small square WebP thumbnail of a render for the homepage gallery. */
async function saveGalleryThumb(id: string, source: Buffer): Promise<void> {
  const thumb = await sharp(source)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
    .webp({ quality: 72 })
    .toBuffer()

  await put(`${GALLERY_BLOB_PREFIX}${id}.webp`, thumb, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
  })
}
