import { defineEventHandler, setResponseHeader } from 'h3'
import { list } from '@vercel/blob'
import { GALLERY_BLOB_PREFIX } from '../utils/storage'

/** How many thumbnails the homepage background shows. */
const GALLERY_SIZE = 12

/**
 * Public gallery feed — most recent generated houses, used as the scrolling
 * background on the homepage. Serves the lightweight WebP thumbnails (not the
 * full-res renders), so a homepage load pulls well under a megabyte from Blob
 * instead of 100+ MB. Best-effort: any error (no Blob token, transient provider
 * hiccup) degrades to an empty list so the homepage still renders.
 */
export default defineEventHandler(async (event) => {
  // Short shared cache: collapses redundant Blob list() calls when several
  // visitors land at once. Content is non-sensitive (public decorative URLs).
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  try {
    // list() returns metadata only (URLs + dates, no image bytes) and costs one
    // op regardless of page size — so we list broadly, sort by recency, and keep
    // only the newest URLs. Slicing at list() instead would return blobs by
    // pathname (random UUID), hiding the freshly generated houses.
    const { blobs } = await list({ prefix: GALLERY_BLOB_PREFIX, limit: 1000 })
    const recent = [...blobs]
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, GALLERY_SIZE)
    return { images: recent.map(b => b.url) }
  } catch {
    return { images: [] }
  }
})
