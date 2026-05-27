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
  <div v-if="compact" class="flex flex-col gap-3 min-w-0">
    <TransitionGroup
      v-if="pickedSuggestions.length"
      tag="div"
      name="chip"
      class="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide -mx-1 px-1"
    >
      <button
        v-for="(suggestion, i) in pickedSuggestions"
        :key="suggestion"
        type="button"
        class="shrink-0 text-sm px-3.5 py-1.5 rounded-full ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-sm hover:bg-violet-500/10 hover:ring-violet-500/40 hover:text-violet-700 dark:hover:text-violet-300 text-neutral-700 dark:text-neutral-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        :style="{ transitionDelay: `${i * 20}ms` }"
        :disabled="loading"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </TransitionGroup>

    <div class="flex items-center gap-2">
      <slot name="prefix" />
      <UInput
        v-model="prompt"
        class="flex-1"
        size="xl"
        :placeholder="placeholder ?? 'Décris comment agencer la pièce…'"
        :disabled="loading"
        @keydown.enter.prevent="handleSubmit"
      />
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        <UIcon
          :name="loading ? 'i-lucide-loader-2' : 'i-lucide-sparkles'"
          :class="['h-4 w-4', loading && 'animate-spin']"
        />
        {{ submitLabel ?? 'Générer' }}
      </button>
    </div>
  </div>

  <div v-else class="flex flex-col gap-3">
    <TransitionGroup
      v-if="pickedSuggestions.length"
      tag="div"
      name="chip"
      class="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide -mx-1 px-1"
    >
      <button
        v-for="suggestion in pickedSuggestions"
        :key="suggestion"
        type="button"
        class="shrink-0 text-sm px-3.5 py-1.5 rounded-full ring-1 ring-black/5 dark:ring-white/10 bg-white/80 dark:bg-neutral-900/60 hover:bg-violet-500/10 hover:ring-violet-500/40 hover:text-violet-700 dark:hover:text-violet-300 text-neutral-700 dark:text-neutral-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="loading"
        @click="applySuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </TransitionGroup>

    <UTextarea
      v-model="prompt"
      :placeholder="placeholder ?? 'Décris comment agencer la pièce… (canapé, table, plantes, ambiance…)'"
      :rows="3"
      :disabled="loading"
      autoresize
      @keydown="onKeydown"
    />

    <div class="flex items-center justify-between gap-3">
      <span class="text-xs text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1.5">
        <kbd class="rounded-md bg-neutral-200/70 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono ring-1 ring-black/5 dark:ring-white/10">⌘ ⏎</kbd>
        pour envoyer
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        <UIcon
          :name="loading ? 'i-lucide-loader-2' : 'i-lucide-sparkles'"
          :class="['h-4 w-4', loading && 'animate-spin']"
        />
        {{ submitLabel ?? 'Générer' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chip-enter-active,
.chip-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
