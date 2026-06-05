import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { REQUIRED_ANSWERS } from '~~/shared/types/architect'
import { briefJsonSchema, parseBrief } from '../../utils/brief'
import { ApiError, withErrorHandling } from '../../utils/errors'
import { type OpenRouterMessage, chatCompletion } from '../../utils/openrouter'
import { ARCHITECT_SYSTEM_PROMPT, buildFragmentHint } from '../../utils/prompts'

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(40),
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

/**
 * Step 1 of the house generation. Runs only the (fast) architect text model so the
 * frontend can display the inferred `profile` as soon as possible — the image
 * step then runs in a second request (~10-20s) without blocking that reveal.
 */
export default defineEventHandler(async (event) => {
  return withErrorHandling(async () => {
    const parsed = await readValidatedBody(event, raw => bodySchema.safeParse(raw))
    if (!parsed.success) {
      throw new ApiError('CONVERSATION_ERROR', 'Body must include { messages }')
    }
    const { messages, fragments } = parsed.data

    const userAnswers = messages.filter(m => m.role === 'user').length
    if (userAnswers < REQUIRED_ANSWERS) {
      throw new ApiError('CONVERSATION_INCOMPLETE', `Need ${REQUIRED_ANSWERS} answers, got ${userAnswers}`)
    }

    const config = useRuntimeConfig()
    const apiKey = config.openRouterApiKey
    if (!apiKey) throw new ApiError('MISSING_API_KEY', 'OPEN_ROUTER_API_KEY not configured')

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

    return { brief, profile: brief.profile, concept: brief.concept }
  })
})
