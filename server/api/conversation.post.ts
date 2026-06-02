import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import type { Fragment } from '~~/shared/types/architect'
import { REQUIRED_ANSWERS } from '~~/shared/types/architect'
import { fragmentJsonSchema, parseFragment } from '../utils/fragment'
import { ApiError, withErrorHandling } from '../utils/errors'
import { type OpenRouterMessage, chatCompletion } from '../utils/openrouter'
import { FRAGMENT_SYSTEM_PROMPT, buildConversationSystemPrompt } from '../utils/prompts'

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

    const config = useRuntimeConfig()
    const apiKey = config.openRouterApiKey
    if (!apiKey) throw new ApiError('MISSING_API_KEY', 'OPEN_ROUTER_API_KEY not configured')

    // Server-counted: which question to ask, and whether the quiz is done.
    const userAnswers = messages.filter(m => m.role === 'user').length
    const complete = userAnswers >= REQUIRED_ANSWERS

    const chat: OpenRouterMessage[] = [
      { role: 'system', content: buildConversationSystemPrompt(userAnswers) },
      ...messages,
    ]

    // Once the user has answered at least once, distil their latest answer into a
    // small ambiance fragment for the live moodboard. This runs IN PARALLEL with
    // the question so it adds no perceptible latency, and is best-effort: any
    // failure resolves to null and never breaks the conversation turn.
    const fragmentPromise: Promise<Fragment | null> = userAnswers >= 1
      ? chatCompletion({
          apiKey,
          model: config.openRouterTextModel,
          messages: [{ role: 'system', content: FRAGMENT_SYSTEM_PROMPT }, ...messages],
          jsonSchema: { name: 'mood_fragment', schema: fragmentJsonSchema as unknown as Record<string, unknown> },
        }).then(parseFragment).catch(() => null)
      : Promise.resolve(null)

    const [message, fragment] = await Promise.all([
      chatCompletion({ apiKey, model: config.openRouterTextModel, messages: chat }),
      fragmentPromise,
    ])

    return { message, complete, fragment }
  })
})
