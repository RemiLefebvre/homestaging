import { z } from 'zod'
import type { HouseBrief } from '~~/shared/types/architect'
import { ApiError } from './errors'

// Claude via OpenRouter does NOT enforce the json_schema, so it sometimes returns
// a string field as an array (e.g. palette: ["gris", "ocre"]). These coercers make
// the zod fallback tolerant: arrays are joined into a string, strings are split into
// a list, so a slightly off-shape answer still yields a usable brief.
const flexString = z
  .union([z.string(), z.array(z.string())])
  .transform(v => (Array.isArray(v) ? v.join(', ') : v))
  .pipe(z.string().trim().min(1))

const flexStringArray = z
  .union([z.array(z.string()), z.string()])
  .transform(v => (Array.isArray(v) ? v : v.split(/[,;]\s*/)))
  .pipe(z.array(z.string().trim().min(1)).min(1))

// Storytelling: tolerant on purpose. A missing, empty, or off-shape `story`
// degrades to [] instead of failing the whole brief — the house still renders.
const storySchema = z
  .array(z.object({ trigger: flexString, design: flexString }))
  .min(1)
  .max(6)
  .catch([])

export const briefSchema = z.object({
  profile: flexString,
  style: flexString,
  materials: flexStringArray,
  palette: flexString,
  environment: flexString,
  concept: flexString,
  story: storySchema,
  imagePrompt: flexString,
})

/**
 * JSON Schema handed to OpenRouter structured outputs (strict). Models that
 * support it return conforming JSON; others ignore it and we rely on the zod
 * parse below as the fallback.
 */
export const briefJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile', 'style', 'materials', 'palette', 'environment', 'concept', 'story', 'imagePrompt'],
  properties: {
    profile: { type: 'string' },
    style: { type: 'string' },
    materials: { type: 'array', items: { type: 'string' } },
    palette: { type: 'string' },
    environment: { type: 'string' },
    concept: { type: 'string' },
    story: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['trigger', 'design'],
        properties: { trigger: { type: 'string' }, design: { type: 'string' } },
      },
    },
    imagePrompt: { type: 'string' },
  },
} as const

/** Parse the model's text answer into a validated HouseBrief, tolerating ```json fences. */
export function parseBrief(raw: string): HouseBrief {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch {
    throw new ApiError('INVALID_PROVIDER_RESPONSE', 'Architect model did not return valid JSON')
  }
  const result = briefSchema.safeParse(json)
  if (!result.success) {
    throw new ApiError('INVALID_PROVIDER_RESPONSE', 'Architect brief failed schema validation')
  }
  return result.data
}
