import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { REQUIRED_ANSWERS } from '~~/shared/types/architect'
import { ApiError, withErrorHandling } from '../utils/errors'
import { type OpenRouterMessage, chatCompletion } from '../utils/openrouter'
import { buildConversationSystemPrompt } from '../utils/prompts'

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
    const message = await chatCompletion({ apiKey, model: config.openRouterTextModel, messages: chat })

    return { message, complete }
  })
})
