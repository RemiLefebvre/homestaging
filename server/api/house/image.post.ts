import { resolve } from 'node:path'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { ApiError, withErrorHandling } from '../../utils/errors'
import { generateImageFromText } from '../../utils/openrouter'
import { saveGeneratedImage } from '../../utils/storage'

const bodySchema = z.object({
  imagePrompt: z.string().trim().min(1).max(4000),
})

/**
 * Step 2 of the house generation. Receives the `imagePrompt` produced by the
 * brief step and returns the rendered exterior. Kept separate so the (fast)
 * brief can light up the loading UI well before the (slow) image lands.
 */
export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('CONVERSATION_ERROR', 'Body must include { imagePrompt }')
    }
    const { imagePrompt } = parsed.data

    const config = useRuntimeConfig()
    const apiKey = config.openRouterApiKey
    if (!apiKey) throw new ApiError('MISSING_API_KEY', 'OPEN_ROUTER_API_KEY not configured')

    const generated = await generateImageFromText({ apiKey, prompt: imagePrompt })
    const publicRoot = resolve(process.cwd(), 'public')
    const { url } = await saveGeneratedImage(generated.buffer, publicRoot)

    return { imageUrl: url }
  })
})
