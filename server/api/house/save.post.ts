import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { leadFormSchema } from '~~/shared/types/lead'
import { ApiError, withErrorHandling } from '../../utils/errors'
import { promotePendingImage } from '../../utils/storage'

const bodySchema = leadFormSchema.extend({
  pendingId: z.string().uuid(),
})

/**
 * "Valider" action: promote the pending render to a permanent house and store
 * the contact info (private lead sidecar). Idempotency isn't guaranteed — the
 * client hides the button once validated, and a missing pending blob 404s.
 */
export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('CONVERSATION_ERROR', 'Body must include { pendingId, firstName, lastName, email }')
    }
    const { pendingId, firstName, lastName, email } = parsed.data
    const { imageUrl } = await promotePendingImage(pendingId, { firstName, lastName, email })
    return { imageUrl }
  })
})
