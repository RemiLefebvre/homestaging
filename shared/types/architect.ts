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
  /** Short evocative name for that colour, EN (e.g. "warm ochre"). */
  colorName: string
  /** One personality / ambiance word, EN (e.g. "cosy"). */
  keyword: string
  /** A material or texture suggested by the answer, EN (e.g. "light wood"). */
  material: string
}

/** A storytelling "moment": one answer from the person ↔ one design choice. */
export interface StoryBeat {
  /** The concrete detail mentioned by the person, EN (e.g. "Felix, your first cat"). */
  trigger: string
  /** The architectural choice that follows, EN (e.g. "a sheltered, sunlit patio"). */
  design: string
  /** Barnum-style mini-interpretation tying the detail to a universal trait (EN). May be empty. */
  meaning: string
}

/** Architectural brief produced by the architect model from the conversation. */
export interface HouseBrief {
  /** Short inferred personality summary, EN (e.g. "warm, contemplative, drawn to nature"). */
  profile: string
  /** Architectural style label, EN. */
  style: string
  /** Main exterior materials. */
  materials: string[]
  /** Colour palette, EN. */
  palette: string
  /** Setting / surroundings + light, EN. */
  environment: string
  /** Intent note tying personality ↔ house (3-4 sentences, EN). */
  concept: string
  /** Storytelling: 3-5 moments tying a specific answer to a design choice (EN). */
  story: StoryBeat[]
  /** Detailed prompt for the image model (photorealistic architectural exterior). */
  imagePrompt: string
}
