import { resolve } from 'node:path'
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { REQUIRED_ANSWERS } from '~~/shared/types/architect'
import { briefJsonSchema, parseBrief } from '../utils/brief'
import { ApiError, withErrorHandling } from '../utils/errors'
import { type OpenRouterMessage, chatCompletion, generateImageFromText } from '../utils/openrouter'
import { ARCHITECT_SYSTEM_PROMPT, buildFragmentHint } from '../utils/prompts'
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
  // Ambiance fragments collected turn-by-turn during the conversation. Optional
  // and best-effort: when present they steer the architect's palette/materials
  // so the final house extends what the user watched being built.
  fragments: z
    .array(
      z.object({
        color: z.string(),
        colorName: z.string(),
        keyword: z.string(),
        material: z.string(),
      }),
    )
    .max(REQUIRED_ANSWERS)
    .optional(),
})

export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('CONVERSATION_ERROR', 'Body must include { messages }')
    }
    const { messages, fragments } = parsed.data

    // Same server-side guard as /api/conversation: refuse before the quiz is done.
    const userAnswers = messages.filter(m => m.role === 'user').length
    if (userAnswers < REQUIRED_ANSWERS) {
      throw new ApiError('CONVERSATION_INCOMPLETE', `Need ${REQUIRED_ANSWERS} answers, got ${userAnswers}`)
    }

    const config = useRuntimeConfig()
    const apiKey = config.openRouterApiKey
    if (!apiKey) throw new ApiError('MISSING_API_KEY', 'OPEN_ROUTER_API_KEY not configured')

    // 1) Architect model → structured brief.
    // Inject the ambiance fragments (if any) so the final palette and materials
    // extend the colours/textures the user already saw being built, rather than
    // diverging from them.
    const chat: OpenRouterMessage[] = [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      ...(fragments && fragments.length
        ? [{ role: 'system', content: buildFragmentHint(fragments) } as OpenRouterMessage]
        : []),
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
