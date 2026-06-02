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

  function reset() {
    if (state.value.loading) return
    state.value = createState()
  }

  return {
    state: readonly(state),
    answersGiven,
    questionsTotal,
    start,
    sendMessage,
    buildHouse,
    reset,
  }
}
