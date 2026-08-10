import { defineEventHandler } from 'h3'
import { list } from '@vercel/blob'
import { GALLERY_BLOB_PREFIX } from '../utils/storage'

/**
 * Public gallery feed — most recent generated houses, used as the scrolling
 * background on the homepage. Serves the lightweight WebP thumbnails (not the
 * full-res renders) and caps the count, so a homepage load pulls well under a
 * megabyte from Blob instead of 100+ MB. Best-effort: any error (no Blob token,
 * transient provider hiccup) degrades to an empty list so the homepage still renders.
 */
export default defineEventHandler(async () => {
  try {
    const { blobs } = await list({ prefix: GALLERY_BLOB_PREFIX, limit: 12 })
    const sorted = [...blobs].sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    )
    return { images: sorted.map(b => b.url) }
  } catch {
    return { images: [] }
  }
})
