import { resolve } from 'node:path'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { ApiError, withErrorHandling } from '../utils/errors'
import { loadSourceImage } from '../utils/image'
import { editImageViaNanoBanana } from '../utils/openrouter'
import { saveGeneratedImage } from '../utils/storage'

const bodySchema = z.object({
  currentImageUrl: z.string().min(1),
  prompt: z.string().trim().min(1),
})

export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('EMPTY_PROMPT', 'Body must include { currentImageUrl, prompt }')
    }
    const { currentImageUrl, prompt } = parsed.data

    const publicRoot = resolve(process.cwd(), 'public')
    const { buffer, mimeType } = await loadSourceImage(currentImageUrl, publicRoot)

    const apiKey = useRuntimeConfig().openRouterApiKey
    if (!apiKey) throw new ApiError('MISSING_API_KEY', 'OPEN_ROUTER_API_KEY not configured')

    const generated = await editImageViaNanoBanana({ apiKey, imageBuffer: buffer, mimeType, prompt })
    const { url } = await saveGeneratedImage(generated.buffer, publicRoot)
    return { imageUrl: url }
  })
})
