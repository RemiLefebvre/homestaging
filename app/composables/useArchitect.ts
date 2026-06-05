import type { ChatMessage, Fragment, HouseBrief } from '~~/shared/types/architect'
import { REQUIRED_ANSWERS } from '~~/shared/types/architect'

interface ArchitectError {
  code: string
  title: string
  hint: string
}

type Phase = 'intro' | 'chat' | 'generating' | 'result'

interface ArchitectState {
  phase: Phase
  messages: ChatMessage[]
  fragments: Fragment[]
  complete: boolean
  loading: boolean
  error: ArchitectError | null
  imageUrl: string | null
  concept: string | null
  profile: string | null
  brief: HouseBrief | null
}

function createState(): ArchitectState {
  return {
    phase: 'intro',
    messages: [],
    fragments: [],
    complete: false,
    loading: false,
    error: null,
    imageUrl: null,
    concept: null,
    profile: null,
    brief: null,
  }
}

export function useArchitect() {
  const state = useState<ArchitectState>('architect', createState)
  const { messageFor, extractCode } = useGenerationError()

  const answersGiven = computed(() => state.value.messages.filter(m => m.role === 'user').length)
  const questionsTotal = REQUIRED_ANSWERS

  // Meaningful words drawn from the user's own answers — used as the floating
  // bubbles shown while the house is being generated.
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'so', 'because', 'as', 'if', 'than',
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'without', 'from', 'into',
    'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'their', 'our',
    'i', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'them', 'us',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
    'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
    'not', 'no', 'yes', 'too', 'very', 'just', 'also', 'then', 'when', 'where',
    'who', 'what', 'which', 'why', 'how', 'all', 'some', 'any', 'more', 'less',
  ])

  const profileWords = computed<string[]>(() => {
    const seen = new Set<string>()
    const words: string[] = []
    for (const m of state.value.messages) {
      if (m.role !== 'user') continue
      for (const raw of m.content.split(/[\s,.;!?:«»"'()]+/)) {
        const word = raw.trim()
        const key = word.toLowerCase()
        if (word.length < 3 || STOP_WORDS.has(key) || seen.has(key)) continue
        seen.add(key)
        words.push(word)
      }
    }
    return words
  })

  async function callApi<T>(path: string, body: unknown): Promise<T> {
    return await $fetch(path, { method: 'POST', body: body as Record<string, unknown> }) as T
  }

  function handleError(err: unknown) {
    const code = extractCode(err) ?? 'PROVIDER_ERROR'
    const msg = messageFor(code)
    state.value.error = { code, title: msg.title, hint: msg.hint }
  }

  /** Start the conversation: fetch the host's greeting + first question. */
  async function start() {
    if (state.value.loading) return
    state.value.phase = 'chat'
    state.value.error = null
    state.value.loading = true
    try {
      const { message } = await callApi<{ message: string, complete: boolean }>('/api/conversation', {
        messages: state.value.messages,
      })
      state.value.messages = [...state.value.messages, { role: 'assistant', content: message }]
    } catch (err) {
      handleError(err)
    } finally {
      state.value.loading = false
    }
  }

  async function sendMessage(text: string) {
    if (state.value.loading || state.value.complete) return
    const trimmed = text.trim()
    if (!trimmed) return

    state.value.messages = [...state.value.messages, { role: 'user', content: trimmed }]
    state.value.error = null
    state.value.loading = true
    try {
      const { message, complete, fragment } = await callApi<{
        message: string
        complete: boolean
        fragment: Fragment | null
      }>('/api/conversation', { messages: state.value.messages })
      state.value.messages = [...state.value.messages, { role: 'assistant', content: message }]
      state.value.complete = complete
      // Best-effort: accumulate the ambiance fragment for the live moodboard.
      if (fragment) state.value.fragments = [...state.value.fragments, fragment]
    } catch (err) {
      // Roll back the optimistic user message so the input can be retried.
      state.value.messages = state.value.messages.slice(0, -1)
      handleError(err)
    } finally {
      state.value.loading = false
    }
  }

  /** Minimum time the inferred profile stays visible in the loading overlay (ms). */
  const PROFILE_MIN_DISPLAY_MS = 10_000

  async function buildHouse() {
    if (state.value.loading || !state.value.complete) return
    state.value.phase = 'generating'
    state.value.error = null
    state.value.loading = true
    try {
      // 1) Fast text call → light up the profile in the overlay ASAP.
      const briefRes = await callApi<{ brief: HouseBrief, profile: string, concept: string }>(
        '/api/house/brief',
        { messages: state.value.messages, fragments: state.value.fragments },
      )
      state.value.brief = briefRes.brief
      state.value.profile = briefRes.profile
      state.value.concept = briefRes.concept
      const profileShownAt = Date.now()

      // 2) Slow image call — runs while the user is reading the profile.
      const imgRes = await callApi<{ imageUrl: string }>(
        '/api/house/image',
        { imagePrompt: briefRes.brief.imagePrompt },
      )
      state.value.imageUrl = imgRes.imageUrl

      // 3) Guarantee the profile stayed up long enough to be read before swapping
      //    to the result. Image is usually slower than this, so it's a safety floor.
      const elapsed = Date.now() - profileShownAt
      if (elapsed < PROFILE_MIN_DISPLAY_MS) {
        await new Promise(resolve => setTimeout(resolve, PROFILE_MIN_DISPLAY_MS - elapsed))
      }

      state.value.phase = 'result'
    } catch (err) {
      handleError(err)
      state.value.phase = 'chat'
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Dev-only shortcut: seed 5 canned answers locally (no per-turn API calls)
   * and jump straight to house generation. Only one request hits the network.
   */
  async function quickTest() {
    if (!import.meta.dev || state.value.loading) return
    const answers = [
      'My very first pet was named Plume, a slightly dreamy ginger cat.',
      'Autumn, late in the afternoon, when the light turns golden.',
      'A remote cabin deep in the forest, far from everything, completely quiet.',
      'I would take my sketchbook and a pencil.',
      'My close ones would say I am contemplative, curious, and warm.',
    ]
    state.value.messages = answers.map<ChatMessage>(content => ({ role: 'user', content }))
    state.value.complete = true
    state.value.error = null
    await buildHouse()
  }

  function reset() {
    if (state.value.loading) return
    state.value = createState()
  }

  return {
    state: readonly(state),
    answersGiven,
    questionsTotal,
    profileWords,
    start,
    sendMessage,
    buildHouse,
    quickTest,
    reset,
  }
}
