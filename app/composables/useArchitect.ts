import type { ChatMessage, HouseBrief } from '~~/shared/types/architect'
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
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais', 'donc',
    'à', 'au', 'aux', 'en', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
    'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son',
    'sa', 'ses', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'que', 'qui', 'quoi', 'dont', 'où', 'est', 'sont', 'suis',
    'es', 'as', 'ai', 'plus', 'moins', 'très', 'trop', 'bien', 'aussi', 'pas',
    'ne', 'oui', 'non', 'mon', 'mais', 'puis', 'alors', 'comme', 'quand', 'car',
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
      const { message, complete } = await callApi<{ message: string, complete: boolean }>(
        '/api/conversation',
        { messages: state.value.messages },
      )
      state.value.messages = [...state.value.messages, { role: 'assistant', content: message }]
      state.value.complete = complete
    } catch (err) {
      // Roll back the optimistic user message so the input can be retried.
      state.value.messages = state.value.messages.slice(0, -1)
      handleError(err)
    } finally {
      state.value.loading = false
    }
  }

  async function buildHouse() {
    if (state.value.loading || !state.value.complete) return
    state.value.phase = 'generating'
    state.value.error = null
    state.value.loading = true
    try {
      const res = await callApi<{
        imageUrl: string
        concept: string
        profile: string
        brief: HouseBrief
      }>('/api/house', { messages: state.value.messages })
      state.value.imageUrl = res.imageUrl
      state.value.concept = res.concept
      state.value.profile = res.profile
      state.value.brief = res.brief
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
      'Mon tout premier animal s\'appelait Plume, un chat roux un peu rêveur.',
      'L\'automne, en fin d\'après-midi, quand la lumière devient dorée.',
      'Une cabane isolée en pleine forêt, loin de tout, au calme.',
      'J\'emporterais mon carnet de croquis et un crayon.',
      'Mes proches diraient que je suis contemplatif, curieux et chaleureux.',
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
