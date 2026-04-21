import type { BaseInterior } from '~~/shared/types/base-interior'

interface HistoryNode {
  id: string
  url: string
  prompt: string
  parentId: string | null
}

interface GenerationError {
  code: string
  title: string
  hint: string
}

interface GeneratorState {
  selectedBase: BaseInterior | null
  currentImageUrl: string | null
  nodes: HistoryNode[]
  currentId: string | null
  loading: boolean
  error: GenerationError | null
  lastPrompt: string | null
}

function createState(): GeneratorState {
  return {
    selectedBase: null,
    currentImageUrl: null,
    nodes: [],
    currentId: null,
    loading: false,
    error: null,
    lastPrompt: null,
  }
}

export function useImageGenerator() {
  const state = useState<GeneratorState>('image-generator', createState)
  const { messageFor, extractCode } = useGenerationError()

  const currentPathIds = computed<Set<string>>(() => {
    const ids = new Set<string>()
    let id: string | null = state.value.currentId
    while (id) {
      ids.add(id)
      const node = state.value.nodes.find(n => n.id === id)
      id = node?.parentId ?? null
    }
    return ids
  })

  function selectBase(base: BaseInterior) {
    if (state.value.loading) return
    state.value.selectedBase = base
    state.value.currentImageUrl = null
    state.value.nodes = []
    state.value.currentId = null
    state.value.error = null
    state.value.lastPrompt = null
  }

  function reset() {
    if (state.value.loading) return
    state.value = createState()
  }

  function revertTo(id: string) {
    if (state.value.loading) return
    const node = state.value.nodes.find(n => n.id === id)
    if (!node) return
    state.value.currentId = id
    state.value.currentImageUrl = node.url
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
      const node: HistoryNode = { id: crypto.randomUUID(), url: imageUrl, prompt: trimmed, parentId: null }
      state.value.nodes = [node]
      state.value.currentId = node.id
      state.value.currentImageUrl = imageUrl
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
      const node: HistoryNode = { id: crypto.randomUUID(), url: imageUrl, prompt: trimmed, parentId: state.value.currentId }
      state.value.nodes = [...state.value.nodes, node]
      state.value.currentId = node.id
      state.value.currentImageUrl = imageUrl
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
    currentPathIds,
    selectBase,
    generateFromBase,
    refine,
    reset,
    revertTo,
    retryLast,
  }
}
