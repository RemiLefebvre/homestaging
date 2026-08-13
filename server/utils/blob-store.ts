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

/** Default retention for `pruneImages` (historical MAX_STORED_IMAGES knob). */
const MAX_STORED_IMAGES = Number(process.env.MAX_STORED_IMAGES) || 25

/**
 * On-demand storage cap: delete the oldest renders (+ their gallery thumbnails)
 * beyond `keep`. Keyed off the `generated/` list; the matching thumbnail is found
 * by reusing the same UUID. Leads are NEVER touched — contacts are the value.
 * Not called on save; invoked only by the import script.
 */
export async function pruneImages(
  { keep = MAX_STORED_IMAGES }: { keep?: number } = {},
): Promise<{ deleted: number }> {
  const { blobs } = await list({ prefix: GENERATED_BLOB_PREFIX, limit: 1000 })
  if (blobs.length <= keep) return { deleted: 0 }

  const stale = [...blobs]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .slice(keep)

  const toDelete = stale.flatMap((b) => {
    const id = b.pathname.slice(GENERATED_BLOB_PREFIX.length).replace(/\.[^.]+$/, '')
    return [b.pathname, `${GALLERY_BLOB_PREFIX}${id}.webp`]
  })

  await del(toDelete)
  return { deleted: stale.length }
}
