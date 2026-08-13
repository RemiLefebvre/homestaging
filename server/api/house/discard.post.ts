import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { withErrorHandling } from '../../utils/errors'
import { discardPendingImage } from '../../utils/storage'

const bodySchema = z.object({ pendingId: z.string().uuid() })

/**
 * "Recommencer" action: drop the un-validated pending render so nothing is kept.
 * Best-effort — a bad body or a missing blob still resolves { ok: true } (the
 * pending TTL sweep is the safety net).
 */
export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (parsed.success) {
      await discardPendingImage(parsed.data.pendingId).catch(() => {})
    }
    return { ok: true }
  })
})
