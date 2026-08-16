import { del, list } from '@vercel/blob'

/**
 * Blob layout + storage-cap logic, kept free of any Nitro/h3 imports so the
 * standalone import script (`scripts/import-prod.mts`, run under plain tsx) can
 * reuse it. `server/utils/storage.ts` (which does pull in h3 via ApiError) also
 * imports from here — single source of truth for prefixes and pruning.
 */

/** Full-res validated renders. */
export const GENERATED_BLOB_PREFIX = 'generated/'

/** Small WebP thumbnails for the homepage gallery background. */
export const GALLERY_BLOB_PREFIX = 'gallery/'

/** Freshly generated renders awaiting validation (temporary). */
export const PENDING_BLOB_PREFIX = 'pending/'

/** Private JSON sidecars holding the contact info of validated houses. */
export const LEADS_BLOB_PREFIX = 'leads/'

/** Default retention for pruning (historical MAX_STORED_IMAGES knob). */
const MAX_STORED_IMAGES = Number(process.env.MAX_STORED_IMAGES) || 25

export interface StaleImage {
  pathname: string
  url: string
  size: number
  /** Derived thumbnail path — deleted alongside, never archived (regenerable). */
  galleryPathname: string
}

/**
 * List the oldest renders beyond `keep`, candidates for deletion. Split from
 * the actual delete so the import script can archive + verify them locally
 * first. Leads are NEVER part of this — contacts are the value.
 */
export async function listStaleImages(
  { keep = MAX_STORED_IMAGES }: { keep?: number } = {},
): Promise<StaleImage[]> {
  const { blobs } = await list({ prefix: GENERATED_BLOB_PREFIX, limit: 1000 })
  if (blobs.length <= keep) return []

  return [...blobs]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(keep)
    .map((b) => {
      const id = b.pathname.slice(GENERATED_BLOB_PREFIX.length).replace(/\.[^.]+$/, '')
      return { pathname: b.pathname, url: b.url, size: b.size, galleryPathname: `${GALLERY_BLOB_PREFIX}${id}.webp` }
    })
}

/** Irreversible: Blob has no trash. Callers must have archived `stale` first. */
export async function deleteImages(stale: StaleImage[]): Promise<{ deleted: number }> {
  if (!stale.length) return { deleted: 0 }
  await del(stale.flatMap(s => [s.pathname, s.galleryPathname]))
  return { deleted: stale.length }
}
