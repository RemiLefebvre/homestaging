import { z } from 'zod'
import type { Fragment } from '~~/shared/types/architect'

// Same resilience philosophy as brief.ts: the model (Claude via OpenRouter) does
// NOT enforce json_schema strictly, so individual fields may arrive off-shape.
// The fragment is a best-effort, decorative signal — never let one bad field
// throw. We coerce what we can and fall back to a sensible value otherwise.

const NEUTRAL = '#A8A29E' // warm stone — the fallback when no usable colour is found

/** Pull the first #RRGGBB-ish token out of any string, normalised to #RRGGBB. */
function normalizeHex(value: unknown): string {
  if (typeof value !== 'string') return NEUTRAL
  const match = /#?([0-9a-f]{6})/i.exec(value.trim())
  return match ? `#${match[1]!.toLowerCase()}` : NEUTRAL
}

const flexText = z
  .union([z.string(), z.array(z.string())])
  .transform(v => (Array.isArray(v) ? v.join(', ') : v))
  .pipe(z.string().trim().min(1))

const fragmentSchema = z.object({
  color: z.unknown().transform(normalizeHex),
  colorName: flexText.catch('shade'),
  keyword: flexText.catch('singular'),
  material: flexText.catch('natural material'),
})

/** JSON Schema handed to OpenRouter structured outputs (strict-capable models). */
export const fragmentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['color', 'colorName', 'keyword', 'material'],
  properties: {
    color: { type: 'string' },
    colorName: { type: 'string' },
    keyword: { type: 'string' },
    material: { type: 'string' },
  },
} as const

/**
 * Parse the model's answer into a Fragment. Returns null (never throws) on any
 * failure so the conversation turn can always succeed — the moodboard simply
 * skips a card when inference fails.
 */
export function parseFragment(raw: string): Fragment | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch {
    return null
  }
  const result = fragmentSchema.safeParse(json)
  return result.success ? result.data : null
}
