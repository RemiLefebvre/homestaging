import type { ApiErrorCode } from '~~/server/utils/errors'

interface ErrorMessage {
  title: string
  hint: string
}

const MESSAGES: Record<ApiErrorCode, ErrorMessage> = {
  MISSING_API_KEY: {
    title: 'Missing configuration',
    hint: 'The OpenRouter API key is not configured on the server. Add NUXT_OPEN_ROUTER_API_KEY to your .env file and restart the server.',
  },
  SOURCE_NOT_FOUND: {
    title: 'Image not found',
    hint: 'The source image could not be found. Pick another base interior or start over.',
  },
  INVALID_SOURCE_PATH: {
    title: 'Invalid path',
    hint: 'The image path is invalid. Start over by picking an interior from the list.',
  },
  UNSUPPORTED_MIME: {
    title: 'Unsupported format',
    hint: 'Only JPEG and PNG are accepted. Check the source file format.',
  },
  SOURCE_TOO_LARGE: {
    title: 'Image too large',
    hint: 'The limit is 5 MB per image. Reduce the size and try again.',
  },
  EMPTY_PROMPT: {
    title: 'Empty message',
    hint: 'Type something before sending.',
  },
  PROVIDER_ERROR: {
    title: 'Service unavailable',
    hint: 'The AI service did not respond. Try again in a moment.',
  },
  INVALID_PROVIDER_RESPONSE: {
    title: 'Invalid response',
    hint: 'The AI did not return a usable result. Try again in a moment.',
  },
  OUTPUT_TOO_LARGE: {
    title: 'Generated image too large',
    hint: 'The returned image exceeds 5 MB. Try again.',
  },
  CONVERSATION_ERROR: {
    title: 'Conversation interrupted',
    hint: 'Unable to continue the exchange. Try sending your message again.',
  },
  CONVERSATION_INCOMPLETE: {
    title: 'A few more answers needed',
    hint: 'Answer the 5 questions before we can build your house.',
  },
}

const FALLBACK: ErrorMessage = {
  title: 'Unexpected error',
  hint: 'Something went wrong. Try again.',
}

export function useGenerationError() {
  function messageFor(code: string | null | undefined): ErrorMessage {
    if (!code) return FALLBACK
    return MESSAGES[code as ApiErrorCode] ?? FALLBACK
  }

  function extractCode(err: unknown): string | null {
    if (err && typeof err === 'object') {
      const anyErr = err as { data?: { code?: string }; statusMessage?: string }
      return anyErr.data?.code ?? anyErr.statusMessage ?? null
    }
    return null
  }

  return { messageFor, extractCode }
}
