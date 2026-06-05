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

/** One storytelling "moment": a person's answer ↔ a design choice. */
export interface StoryBeat {
  /** Concrete detail mentioned by the person, FR output (e.g. "Felix, ton premier chat"). */
  trigger: string
  /** Architectural choice that follows, FR output (e.g. "un patio protégé et ensoleillé"). */
  design: string
  /** Barnum-style mini-interpretation tying the detail to a universal trait, FR output. May be empty. */
  meaning: string
}

/** Architectural brief produced by the architect model from the conversation. */
export interface HouseBrief {
  /** Short inferred personality summary, FR output (e.g. "chaleureux, contemplatif, attaché à la nature"). */
  profile: string
  /** Architectural style label, FR output. */
  style: string
  /** Main exterior materials. */
  materials: string[]
  /** Colour palette, FR output. */
  palette: string
  /** Setting / surroundings + light, FR output. */
  environment: string
  /** Intent note tying personality ↔ house (3-4 sentences, FR output). */
  concept: string
  /** Storytelling: 3-5 moments tying a specific answer to a design choice, FR output. */
  story: StoryBeat[]
  /** Detailed prompt for the image model (photorealistic architectural exterior). */
  imagePrompt: string
}
