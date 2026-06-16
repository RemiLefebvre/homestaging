import OpenAI from 'openai'
import { ApiError } from './errors'
import { type InputMime, type OutputMime, validateOutputImage } from './image'

const IMAGE_MODEL = 'google/gemini-2.5-flash-image'
const BASE_URL = 'https://openrouter.ai/api/v1'

let cachedClient: OpenAI | null = null

function getClient(apiKey: string): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: BASE_URL })
  }
  return cachedClient
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Generous ceiling so a long brief (story array + detailed imagePrompt) is never
// truncated mid-generation. Anthropic on OpenRouter does not default to a high
// value, so we set it explicitly.
const MAX_TOKENS = 4096

/**
 * Plain text chat completion via OpenRouter.
 *
 * We deliberately do NOT use `response_format: json_schema`: for Anthropic models
 * OpenRouter emulates it via a forced tool call, a fragile path that intermittently
 * returns an empty message (content/tool_calls/refusal all null → 502). Callers that
 * need JSON instruct the model in the prompt and parse the text tolerantly (zod).
 * A single retry absorbs transient empty responses from the provider.
 */
export async function chatCompletion(params: {
  apiKey: string
  model: string
  messages: OpenRouterMessage[]
}): Promise<string> {
  const { apiKey, model, messages } = params
  const client = getClient(apiKey)

  const attempt = async (): Promise<{ text: string; finishReason: string }> => {
    let response
    try {
      response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: MAX_TOKENS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new ApiError('PROVIDER_ERROR', `OpenRouter chat call failed: ${msg}`)
    }

    const choice = response.choices?.[0]
    const message = choice?.message
    let text = typeof message?.content === 'string' ? message.content : ''

    // Defensive: if a provider ever returns the payload through a tool call
    // instead of content, still surface it rather than failing.
    if (!text.trim()) {
      const toolArgs = message?.tool_calls?.[0]?.function?.arguments
      if (typeof toolArgs === 'string' && toolArgs.trim()) {
        text = toolArgs
      }
    }

    if (!text.trim()) {
      console.error(
        `OpenRouter empty content (finish_reason: ${choice?.finish_reason ?? 'unknown'}); message shape:`,
        JSON.stringify(message),
      )
    }
    return { text, finishReason: choice?.finish_reason ?? 'unknown' }
  }

  let { text, finishReason } = await attempt()
  if (!text.trim()) {
    // The empty response is transient on Anthropic via OpenRouter — retry once.
    ;({ text, finishReason } = await attempt())
  }

  if (!text.trim()) {
    throw new ApiError(
      'INVALID_PROVIDER_RESPONSE',
      `OpenRouter returned no text content (finish_reason: ${finishReason})`,
    )
  }
  return text
}

/**
 * Text-to-image generation via OpenRouter (Gemini 2.5 Flash Image).
 *
 * Same response shape as {@link editImageViaNanoBanana} but with NO input image —
 * only a text content part. If the model rejects pure text-to-image, fall back to
 * editImageViaNanoBanana with a neutral base image.
 */
export async function generateImageFromText(params: {
  apiKey: string
  prompt: string
}): Promise<{ buffer: Buffer; mimeType: OutputMime }> {
  const { apiKey, prompt } = params
  const client = getClient(apiKey)

  let response
  try {
    response = await client.chat.completions.create({
      model: IMAGE_MODEL,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modalities: ['image', 'text'],
    } as any)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new ApiError('PROVIDER_ERROR', `OpenRouter image call failed: ${msg}`)
  }

  return extractImage(response)
}

/**
 * Edit an image via OpenRouter's chat completions endpoint (Nano Banana / Gemini 2.5 Flash Image).
 *
 * Kept as the base pattern for {@link generateImageFromText} and as the fallback
 * (generate from a neutral base image) until pure text-to-image is validated.
 *
 * The provider expects a multimodal user message (image data-URI + text) and returns
 * generated images in `message.images[]` as content parts of the shape
 *   { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
 */
export async function editImageViaNanoBanana(params: {
  apiKey: string
  imageBuffer: Buffer
  mimeType: InputMime
  prompt: string
}): Promise<{ buffer: Buffer; mimeType: OutputMime }> {
  const { apiKey, imageBuffer, mimeType, prompt } = params
  const client = getClient(apiKey)
  const base64Url = `data:${mimeType};base64,${imageBuffer.toString('base64')}`

  let response
  try {
    response = await client.chat.completions.create({
      model: IMAGE_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: base64Url } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modalities: ['image', 'text'],
    } as any)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new ApiError('PROVIDER_ERROR', `OpenRouter call failed: ${msg}`)
  }

  return extractImage(response)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImage(response: any): { buffer: Buffer; mimeType: OutputMime } {
  const choice = response.choices?.[0]
  const images = (choice?.message as { images?: { type: string; image_url?: { url: string } }[] })
    ?.images

  const dataUri = images?.[0]?.image_url?.url
  if (!dataUri) {
    throw new ApiError(
      'INVALID_PROVIDER_RESPONSE',
      `OpenRouter returned no image (finish_reason: ${choice?.finish_reason ?? 'unknown'})`,
    )
  }

  const buffer = parseDataUri(dataUri)
  const outputMime = validateOutputImage(buffer)
  return { buffer, mimeType: outputMime }
}

function parseDataUri(dataUri: string): Buffer {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(dataUri)
  if (!match) {
    throw new ApiError('INVALID_PROVIDER_RESPONSE', 'Provider returned an unrecognised data URI')
  }
  return Buffer.from(match[2]!, 'base64')
}
