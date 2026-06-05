import { defineEventHandler } from 'h3'
import { list } from '@vercel/blob'
import { GENERATED_BLOB_PREFIX } from '../utils/storage'

/**
 * Public gallery feed — most recent generated houses, used as the scrolling
 * background on the homepage. Best-effort: any error (no Blob token, transient
 * provider hiccup) degrades to an empty list so the homepage still renders.
 */
export default defineEventHandler(async () => {
  try {
    const { blobs } = await list({ prefix: GENERATED_BLOB_PREFIX, limit: 100 })
    const sorted = [...blobs].sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    )
    return { images: sorted.map(b => b.url) }
  } catch {
    return { images: [] }
  }
})
