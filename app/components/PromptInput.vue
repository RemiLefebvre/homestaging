<script setup lang="ts">
import suggestions from '~/assets/prompt-suggestions.json'
import type { RoomType } from '~~/shared/types/base-interior'

const props = defineProps<{
  loading: boolean
  placeholder?: string
  submitLabel?: string
  compact?: boolean
  roomType?: RoomType
}>()

const emit = defineEmits<{
  submit: [prompt: string]
}>()

const prompt = ref('')

const canSubmit = computed(() => !props.loading && prompt.value.trim().length > 0)

const pickedSuggestions = computed(() => {
  const all = suggestions as Record<string, string[]>
  const common = all.common ?? []
  const pool = props.roomType
    ? [...(all[props.roomType] ?? []), ...common]
    : Object.values(all).flat()
  return [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 10)
})

function handleSubmit() {
  if (!canSubmit.value) return
  const value = prompt.value.trim()
  emit('submit', value)
  prompt.value = ''
}

function applySuggestion(suggestion: string) {
  if (props.loading) return
  prompt.value = suggestion
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div v-if="compact" class="flex flex-col gap-2 min-w-0">
    <div v-if="pickedSuggestions.length" class="suggestions-row flex gap-2 overflow-x-auto whitespace-nowrap px-4">
      <button
        v-for="suggestion in pickedSuggestions"
        :key="suggestion"
        type="button"
        class="shrink-0 text-xs px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
    <div class="flex items-center gap-2 px-4">
      <slot name="prefix" />
      <UInput
        v-model="prompt"
        class="flex-1"
        size="xl"
        :placeholder="placeholder ?? 'Décris comment agencer la pièce…'"
        :disabled="loading"
        @keydown.enter.prevent="handleSubmit"
      />
      <UButton
        icon="i-lucide-sparkles"
        size="xl"
        :loading="loading"
        :disabled="!canSubmit"
        color="primary"
        @click="handleSubmit"
      >
        {{ submitLabel ?? 'Générer' }}
      </UButton>
    </div>
  </div>

  <div v-else class="flex flex-col gap-3">
    <div v-if="pickedSuggestions.length" class="suggestions-row flex gap-2 overflow-x-auto whitespace-nowrap -mx-1 px-1">
      <button
        v-for="suggestion in pickedSuggestions"
        :key="suggestion"
        type="button"
        class="shrink-0 text-xs px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
    <UTextarea
      v-model="prompt"
      :placeholder="placeholder ?? 'Décris comment agencer la pièce… (canapé, table, plantes, ambiance…)'"
      :rows="3"
      :disabled="loading"
      autoresize
      @keydown="onKeydown"
    />
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs text-neutral-500">
        Cmd/Ctrl + Enter pour envoyer
      </span>
      <UButton
        icon="i-lucide-sparkles"
        :loading="loading"
        :disabled="!canSubmit"
        color="primary"
        @click="handleSubmit"
      >
        {{ submitLabel ?? 'Générer' }}
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.suggestions-row {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.suggestions-row::-webkit-scrollbar {
  display: none;
}
</style>
