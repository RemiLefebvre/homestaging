import { resolve } from 'node:path'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { REQUIRED_ANSWERS } from '~~/shared/types/architect'
import { briefJsonSchema, parseBrief } from '../utils/brief'
import { ApiError, withErrorHandling } from '../utils/errors'
import { type OpenRouterMessage, chatCompletion, generateImageFromText } from '../utils/openrouter'
import { ARCHITECT_SYSTEM_PROMPT } from '../utils/prompts'
import { saveGeneratedImage } from '../utils/storage'

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(40),
})

export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('CONVERSATION_ERROR', 'Body must include { messages }')
    }
    const { messages } = parsed.data

    // Same server-side guard as /api/conversation: refuse before the quiz is done.
    const userAnswers = messages.filter(m => m.role === 'user').length
    if (userAnswers < REQUIRED_ANSWERS) {
      throw new ApiError('CONVERSATION_INCOMPLETE', `Need ${REQUIRED_ANSWERS} answers, got ${userAnswers}`)
    }

    const config = useRuntimeConfig()
    const apiKey = config.openRouterApiKey
    if (!apiKey) throw new ApiError('MISSING_API_KEY', 'OPEN_ROUTER_API_KEY not configured')

    // 1) Architect model → structured brief.
    const chat: OpenRouterMessage[] = [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      ...messages,
    ]
    const rawBrief = await chatCompletion({
      apiKey,
      model: config.openRouterTextModel,
      messages: chat,
      jsonSchema: { name: 'house_brief', schema: briefJsonSchema as unknown as Record<string, unknown> },
    })
    const brief = parseBrief(rawBrief)

    // 2) Image model → house exterior (text-to-image).
    const generated = await generateImageFromText({ apiKey, prompt: brief.imagePrompt })

    // 3) Persist and return.
    const publicRoot = resolve(process.cwd(), 'public')
    const { url } = await saveGeneratedImage(generated.buffer, publicRoot)

    return { imageUrl: url, concept: brief.concept, profile: brief.profile, brief }
  })
})
