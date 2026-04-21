import OpenAI from 'openai'
import { ApiError } from './errors'
import { type InputMime, type OutputMime, validateOutputImage } from './image'

const MODEL = 'google/gemini-2.5-flash-image'
const BASE_URL = 'https://openrouter.ai/api/v1'

let cachedClient: OpenAI | null = null

function getClient(apiKey: string): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: BASE_URL })
  }
  return cachedClient
}

/**
 * Edit an image via OpenRouter's chat completions endpoint (Nano Banana / Gemini 2.5 Flash Image).
 *
 * Pattern mirrored from cassini backend:
 *   apps/backend/src/modules/models/providers/openrouter-image-generation.service.ts:137-173
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
      model: MODEL,
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

  const choice = response.choices?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = (choice?.message as any)?.images as
    | { type: string; image_url?: { url: string } }[]
    | undefined

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
