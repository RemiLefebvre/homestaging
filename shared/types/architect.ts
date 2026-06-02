export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Number of user answers required before the house can be built. */
export const REQUIRED_ANSWERS = 5

/**
 * A small ambiance fragment inferred from a single user answer during the
 * conversation. The frontend accumulates one per answer to progressively build
 * the moodboard, palette and construction progress while the quiz unfolds.
 */
export interface Fragment {
  /** Hex colour evoked by the answer, normalised to #RRGGBB. */
  color: string
  /** Short evocative name for that colour, FR (ex: "ocre chaleureux"). */
  colorName: string
  /** One personality / ambiance word, FR (ex: "cosy"). */
  keyword: string
  /** A material or texture suggested by the answer, FR (ex: "bois clair"). */
  material: string
}

/** Un « moment » du storytelling : une réponse de la personne ↔ un choix de design. */
export interface StoryBeat {
  /** Le détail concret évoqué par la personne, FR (ex : "Felix, ton premier chat"). */
  trigger: string
  /** Le choix architectural qui en découle, FR (ex : "un patio protégé et ensoleillé"). */
  design: string
}

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
  /** Storytelling : 3-5 moments reliant une réponse précise à un choix de design (FR). */
  story: StoryBeat[]
  /** Detailed prompt for the image model (photorealistic architectural exterior). */
  imagePrompt: string
}
