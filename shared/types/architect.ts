export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Number of user answers required before the house can be built. */
export const REQUIRED_ANSWERS = 5

/** Architectural brief produced by the architect model from the conversation. */
export interface HouseBrief {
  /** Short inferred personality summary, FR (ex: "chaleureux, contemplatif, attaché à la nature"). */
  profile: string
  /** Architectural style label, FR. */
  style: string
  /** Main exterior materials. */
  materials: string[]
  /** Colour palette, FR. */
  palette: string
  /** Setting / surroundings + light, FR. */
  environment: string
  /** Note d'intention reliant personnalité ↔ maison (3-4 phrases, FR). */
  concept: string
  /** Detailed prompt for the image model (photorealistic architectural exterior). */
  imagePrompt: string
}
