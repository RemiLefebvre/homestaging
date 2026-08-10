import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
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

  return { url: blob.url, mimeType: mime }
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
