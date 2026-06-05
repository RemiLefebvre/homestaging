<script setup lang="ts">
import { Motion } from 'motion-v'

const { state, questionsTotal, sendMessage, buildHouse } = useArchitect()

const draft = ref('')
const scroller = ref<HTMLElement | null>(null)
const inputRef = ref<{ textareaRef?: HTMLTextAreaElement, $el?: HTMLElement } | null>(null)

const canSend = computed(() => !state.value.loading && !state.value.complete && draft.value.trim().length > 0)

// UTextarea exposes its underlying <textarea> via `textareaRef`; fall back to a DOM query
// in case Nuxt UI changes that contract.
function focusInput() {
  const el = inputRef.value
  const textarea = el?.textareaRef ?? el?.$el?.querySelector?.('textarea') ?? null
  textarea?.focus()
}

function submit() {
  if (!canSend.value) return
  const value = draft.value.trim()
  draft.value = ''
  sendMessage(value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}

// Keep the latest message in view, and bring focus back to the input when the
// model finishes replying — the `:disabled` on UTextarea drops focus otherwise.
watch(
  () => [state.value.messages.length, state.value.loading] as const,
  async ([, loading]) => {
    await nextTick()
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
    if (!loading && !state.value.complete) focusInput()
  },
)
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col h-[calc(100vh-3.5rem)]">
    <!-- Progress: the house comes together as the palette + moodboard fill up answer by answer. -->
    <MoodboardPanel :fragments="state.fragments" :total="questionsTotal" />

    <!-- Conversation thread -->
    <div
      ref="scroller"
      class="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col gap-4 py-2"
    >
      <Motion
        v-for="(msg, i) in state.messages"
        :key="i"
        :initial="{ opacity: 0, y: 8 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3 }"
        :class="msg.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[85%] flex gap-2.5'"
      >
        <span
          v-if="msg.role === 'assistant'"
          class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand shadow-md shadow-violet-500/30 self-end"
        >
          <UIcon name="i-lucide-sparkles" class="h-4 w-4 text-white" />
        </span>
        <div
          class="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
          :class="msg.role === 'user'
            ? 'bg-gradient-brand text-white rounded-br-md shadow-lg shadow-violet-500/20'
            : 'surface-glass rounded-bl-md text-neutral-800 dark:text-neutral-100'"
        >
          {{ msg.content }}
        </div>
      </Motion>

      <!-- Typing indicator -->
      <div v-if="state.loading" class="self-start flex gap-2.5 items-end">
        <span class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand shadow-md shadow-violet-500/30">
          <UIcon name="i-lucide-sparkles" class="h-4 w-4 text-white" />
        </span>
        <div class="surface-glass rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
          <span v-for="d in 3" :key="d" class="h-2 w-2 rounded-full bg-violet-400/70 animate-bounce" :style="{ animationDelay: `${(d - 1) * 0.15}s` }" />
        </div>
      </div>
    </div>

    <UAlert
      v-if="state.error"
      class="mt-2"
      color="error"
      variant="soft"
      :title="state.error.title"
      :description="state.error.hint"
      icon="i-lucide-alert-triangle"
    />

    <!-- Input zone / final action -->
    <div class="py-4">
      <div class="surface-glass-strong rounded-2xl p-3 shadow-2xl shadow-violet-500/5 ring-1 ring-black/5 dark:ring-white/10">
        <template v-if="state.complete">
          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            :disabled="state.loading"
            @click="buildHouse()"
          >
            <UIcon name="i-lucide-home" class="h-4 w-4" />
            Construis ma maison
          </button>
        </template>
        <div v-else class="flex items-end gap-2">
          <UTextarea
            ref="inputRef"
            v-model="draft"
            class="flex-1"
            :rows="1"
            autoresize
            :placeholder="state.loading ? 'Patiente un instant…' : 'Ta réponse…'"
            :disabled="state.loading"
            @keydown="onKeydown"
          />
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl h-11 w-11 text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            :disabled="!canSend"
            :aria-label="'Envoyer'"
            @click="submit"
          >
            <UIcon
              :name="state.loading ? 'i-lucide-loader-2' : 'i-lucide-arrow-up'"
              :class="['h-5 w-5', state.loading && 'animate-spin']"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
