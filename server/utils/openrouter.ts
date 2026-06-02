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

/**
 * Plain text chat completion via OpenRouter.
 *
 * When `jsonSchema` is provided we ask for OpenRouter structured outputs
 * (`response_format: json_schema`, strict). Support depends on the model — the
 * caller is responsible for a zod fallback if the provider ignores the schema.
 */
export async function chatCompletion(params: {
  apiKey: string
  model: string
  messages: OpenRouterMessage[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonSchema?: { name: string; schema: Record<string, any> }
}): Promise<string> {
  const { apiKey, model, messages, jsonSchema } = params
  const client = getClient(apiKey)

  let response
  try {
    response = await client.chat.completions.create({
      model,
      messages,
      ...(jsonSchema
        ? {
            response_format: {
              type: 'json_schema',
              json_schema: { name: jsonSchema.name, strict: true, schema: jsonSchema.schema },
            },
          }
        : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new ApiError('PROVIDER_ERROR', `OpenRouter chat call failed: ${msg}`)
  }

  const text = response.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    throw new ApiError('INVALID_PROVIDER_RESPONSE', 'OpenRouter returned no text content')
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
