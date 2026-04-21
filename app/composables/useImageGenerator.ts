import type { BaseInterior } from '~~/shared/types/base-interior'

interface HistoryEntry {
  url: string
  prompt: string
}

interface GenerationError {
  code: string
  title: string
  hint: string
}

interface GeneratorState {
  selectedBase: BaseInterior | null
  currentImageUrl: string | null
  history: HistoryEntry[]
  loading: boolean
  error: GenerationError | null
  lastPrompt: string | null
}

function createState(): GeneratorState {
  return {
    selectedBase: null,
    currentImageUrl: null,
    history: [],
    loading: false,
    error: null,
    lastPrompt: null,
  }
}

export function useImageGenerator() {
  const state = useState<GeneratorState>('image-generator', createState)
  const { messageFor, extractCode } = useGenerationError()

  function selectBase(base: BaseInterior) {
    if (state.value.loading) return
    state.value.selectedBase = base
    state.value.currentImageUrl = null
    state.value.history = []
    state.value.error = null
    state.value.lastPrompt = null
  }

  function reset() {
    if (state.value.loading) return
    state.value = createState()
  }

  function revertTo(index: number) {
    if (state.value.loading) return
    const entry = state.value.history[index]
    if (!entry) return
    state.value.currentImageUrl = entry.url
    state.value.history = state.value.history.slice(0, index + 1)
    state.value.error = null
  }

  async function callApi<T>(path: string, body: unknown): Promise<T> {
    return await $fetch<T>(path, { method: 'POST', body })
  }

  async function generateFromBase(prompt: string) {
    if (state.value.loading) return
    const base = state.value.selectedBase
    if (!base) return
    const trimmed = prompt.trim()
    if (!trimmed) return

    state.value.loading = true
    state.value.error = null
    state.value.lastPrompt = trimmed
    try {
      const { imageUrl } = await callApi<{ imageUrl: string }>('/api/generate', {
        baseId: base.id,
        prompt: trimmed,
      })
      state.value.currentImageUrl = imageUrl
      state.value.history = [{ url: imageUrl, prompt: trimmed }]
    } catch (err) {
      handleError(err)
    } finally {
      state.value.loading = false
    }
  }

  async function refine(prompt: string) {
    if (state.value.loading) return
    const currentImageUrl = state.value.currentImageUrl
    if (!currentImageUrl) return
    const trimmed = prompt.trim()
    if (!trimmed) return

    state.value.loading = true
    state.value.error = null
    state.value.lastPrompt = trimmed
    try {
      const { imageUrl } = await callApi<{ imageUrl: string }>('/api/edit', {
        currentImageUrl,
        prompt: trimmed,
      })
      state.value.currentImageUrl = imageUrl
      state.value.history = [...state.value.history, { url: imageUrl, prompt: trimmed }]
    } catch (err) {
      handleError(err)
    } finally {
      state.value.loading = false
    }
  }

  async function retryLast() {
    const prompt = state.value.lastPrompt
    if (!prompt || state.value.loading) return
    if (state.value.currentImageUrl) {
      await refine(prompt)
    } else {
      await generateFromBase(prompt)
    }
  }

  function handleError(err: unknown) {
    const code = extractCode(err) ?? 'PROVIDER_ERROR'
    const msg = messageFor(code)
    state.value.error = { code, title: msg.title, hint: msg.hint }
  }

  return {
    state: readonly(state),
    selectBase,
    generateFromBase,
    refine,
    reset,
    revertTo,
    retryLast,
  }
}
