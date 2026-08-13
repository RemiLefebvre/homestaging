import { randomUUID } from 'node:crypto'
import { del, list, put } from '@vercel/blob'
import sharp from 'sharp'
import type { LeadForm, StoredLead } from '~~/shared/types/lead'
import { extensionForMime, validateOutputImage } from './image'
import { ApiError } from './errors'
import { GENERATED_BLOB_PREFIX, GALLERY_BLOB_PREFIX, LEADS_BLOB_PREFIX, PENDING_BLOB_PREFIX } from './blob-store'

/** Edge of the square gallery thumbnail, in px. */
const THUMB_SIZE = 512

/** A pending render older than this is considered abandoned and pruned. */
const PENDING_TTL_MS = 60 * 60 * 1000 // 1h

/**
 * Persist a freshly generated image to a PENDING slot in Vercel Blob. Nothing is
 * kept long-term here: the render is only promoted to `generated/` when the user
 * validates. Returns a public CDN URL (cheap to display) plus the UUID that keys
 * every later step (promote / discard).
 *
 * Requires `BLOB_READ_WRITE_TOKEN` in the environment. In production, Vercel
 * injects it automatically when a Blob store is linked to the project. Locally,
 * use `vercel env pull` (or set it manually in `.env`).
 */
export async function savePendingImage(
  buffer: Buffer,
): Promise<{ imageUrl: string; pendingId: string }> {
  const mime = validateOutputImage(buffer)
  const ext = extensionForMime(mime)
  const id = randomUUID()

  const blob = await put(`${PENDING_BLOB_PREFIX}${id}.${ext}`, buffer, {
    access: 'public',
    contentType: mime,
    addRandomSuffix: false,
  })

  // Best-effort: sweep abandoned pending renders (tab closed without a choice).
  // Never let this break the user's render.
  await cleanupStalePending().catch((err) => {
    console.error('[storage] pending cleanup failed:', err)
  })

  return { imageUrl: blob.url, pendingId: id }
}

/**
 * Promote a validated pending render: create its gallery thumbnail, write the
 * full-res render + the private lead sidecar (same UUID), then drop the pending
 * blob. Throws SOURCE_NOT_FOUND if the pending render is gone (expired/invalid).
 */
export async function promotePendingImage(
  pendingId: string,
  contact: LeadForm,
): Promise<{ imageUrl: string }> {
  const { blobs } = await list({ prefix: `${PENDING_BLOB_PREFIX}${pendingId}`, limit: 1 })
  const pending = blobs[0]
  if (!pending) {
    throw new ApiError('SOURCE_NOT_FOUND', 'Pending render not found or expired')
  }

  const res = await fetch(pending.url)
  if (!res.ok) throw new ApiError('SOURCE_NOT_FOUND', `Pending render unreadable (HTTP ${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const mime = validateOutputImage(buffer)
  const ext = extensionForMime(mime)

  // Decorative-only: never let a thumbnail failure break validation.
  await saveGalleryThumb(pendingId, buffer).catch((err) => {
    console.error(`[gallery] thumbnail failed for ${pendingId}:`, err)
  })

  const generated = await put(`${GENERATED_BLOB_PREFIX}${pendingId}.${ext}`, buffer, {
    access: 'public',
    contentType: mime,
    addRandomSuffix: false,
    // Re-validation after a partial failure hits the same UUID — overwrite, don't throw.
    allowOverwrite: true,
  })

  const lead: StoredLead = { ...contact, imageUrl: generated.url, createdAt: new Date().toISOString() }
  // Store is public — access:'private' is rejected. The random suffix turns the lead
  // URL into an unguessable capability (never returned to the client), keeping PII out of reach.
  await put(`${LEADS_BLOB_PREFIX}${pendingId}.json`, JSON.stringify(lead), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  })

  await del(pending.pathname)

  return { imageUrl: generated.url }
}

/** Drop an un-validated pending render (Recommencer). Best-effort, ignores absence. */
export async function discardPendingImage(pendingId: string): Promise<void> {
  const { blobs } = await list({ prefix: `${PENDING_BLOB_PREFIX}${pendingId}`, limit: 1 })
  if (blobs[0]) await del(blobs[0].pathname)
}

/** Delete pending renders older than PENDING_TTL_MS. */
async function cleanupStalePending(): Promise<void> {
  const { blobs } = await list({ prefix: PENDING_BLOB_PREFIX, limit: 1000 })
  const cutoff = Date.now() - PENDING_TTL_MS
  const stale = blobs.filter(b => b.uploadedAt.getTime() < cutoff).map(b => b.pathname)
  if (stale.length) await del(stale)
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
    allowOverwrite: true,
  })
}
