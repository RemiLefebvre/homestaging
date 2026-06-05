import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { extensionForMime, type OutputMime, validateOutputImage } from './image'

/**
 * Vercel Blob prefix under which generated houses are stored. Keeping a stable
 * prefix lets the gallery endpoint list ONLY our images (in case other features
 * later write blobs of their own).
 */
export const GENERATED_BLOB_PREFIX = 'generated/'

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
  const pathname = `${GENERATED_BLOB_PREFIX}${randomUUID()}.${ext}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: mime,
    // We mint our own UUID — don't let the SDK append its own random suffix.
    addRandomSuffix: false,
  })

  return { url: blob.url, mimeType: mime }
}
