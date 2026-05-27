<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { Motion } from 'motion-v'

const { state, currentPathIds, refine, reset, revertTo, retryLast } = useImageGenerator()
const toast = useToast()

const compareOpen = ref(false)
const beforeUrl = computed(() => {
  const base = state.value.selectedBase
  return base ? `/base-interiors/${base.filename}` : null
})

const currentNode = computed(() => state.value.nodes.find(n => n.id === state.value.currentId) ?? null)
const currentPrompt = computed(() => currentNode.value?.prompt ?? state.value.lastPrompt ?? '')

const { copy, copied, isSupported: clipboardSupported } = useClipboard({ source: currentPrompt })

watch(() => state.value.currentImageUrl, () => {
  compareOpen.value = false
})

function onSubmit(prompt: string) {
  refine(prompt)
}

async function copyPrompt() {
  if (!currentPrompt.value || !clipboardSupported.value) return
  await copy(currentPrompt.value)
  toast.add({
    title: 'Prompt copié',
    description: currentPrompt.value,
    icon: 'i-lucide-clipboard-check',
    color: 'success',
  })
}

function downloadImage() {
  const url = state.value.currentImageUrl
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `homestaging-${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function nodeRingClass(id: string) {
  if (id === state.value.currentId) return 'ring-2 ring-violet-500'
  if (currentPathIds.value.has(id)) return 'ring-1 ring-violet-300/60 dark:ring-violet-400/40'
  return 'ring-1 ring-black/5 dark:ring-white/10 opacity-60 group-hover:opacity-100'
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col h-[calc(100vh-3.5rem)]">
    <div class="flex-1 min-h-0 flex gap-4 pt-4">
      <div class="flex-1 min-w-0 relative rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-xl shadow-violet-500/5 bg-neutral-100 dark:bg-neutral-900">
        <CompareSlider
          v-if="compareOpen && beforeUrl && state.currentImageUrl"
          :before-url="beforeUrl"
          :after-url="state.currentImageUrl"
          before-label="Base"
          after-label="Généré"
        />
        <Transition v-else name="fade-img" mode="out-in">
          <img
            v-if="state.currentImageUrl"
            :key="state.currentImageUrl"
            :src="state.currentImageUrl"
            alt="Intérieur généré"
            class="w-full h-full object-contain"
          >
        </Transition>

        <div class="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            v-if="beforeUrl"
            type="button"
            class="surface-glass rounded-full px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-100 ring-1 ring-black/5 dark:ring-white/10 hover:ring-violet-500/40 transition disabled:opacity-50"
            :class="compareOpen && 'bg-gradient-brand text-white border-transparent'"
            :disabled="state.loading"
            @click="compareOpen = !compareOpen"
          >
            <span class="inline-flex items-center gap-1.5">
              <UIcon name="i-lucide-arrow-left-right" class="h-3.5 w-3.5" />
              {{ compareOpen ? 'Fermer' : 'Comparer' }}
            </span>
          </button>
          <button
            type="button"
            class="surface-glass h-8 w-8 inline-flex items-center justify-center rounded-full text-neutral-800 dark:text-neutral-100 ring-1 ring-black/5 dark:ring-white/10 hover:ring-violet-500/40 transition disabled:opacity-50"
            :disabled="state.loading || !currentPrompt || !clipboardSupported"
            :aria-label="copied ? 'Prompt copié' : 'Copier le prompt'"
            @click="copyPrompt"
          >
            <UIcon :name="copied ? 'i-lucide-clipboard-check' : 'i-lucide-clipboard'" class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="surface-glass h-8 w-8 inline-flex items-center justify-center rounded-full text-neutral-800 dark:text-neutral-100 ring-1 ring-black/5 dark:ring-white/10 hover:ring-violet-500/40 transition disabled:opacity-50"
            :disabled="state.loading || !state.currentImageUrl"
            aria-label="Télécharger l'image"
            @click="downloadImage"
          >
            <UIcon name="i-lucide-download" class="h-4 w-4" />
          </button>
        </div>

        <ProgressOverlay v-if="state.loading" />
      </div>

      <div v-if="state.nodes.length > 1" class="hidden md:flex w-44 shrink-0 flex-col surface-glass rounded-2xl p-3 ring-1 ring-black/5 dark:ring-white/10">
        <p class="px-1 mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 shrink-0">
          Historique · <span class="tabular-nums">{{ state.nodes.length }}</span>
        </p>
        <div class="flex flex-col gap-3 overflow-y-auto flex-1 scrollbar-thin pr-1">
          <Motion
            v-for="node in [...state.nodes].reverse()"
            :key="node.id"
            :initial="{ opacity: 0, x: 8 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.25 }"
          >
            <button
              class="w-full text-left group rounded-xl overflow-hidden transition disabled:cursor-not-allowed"
              :disabled="state.loading"
              @click="revertTo(node.id)"
            >
              <img
                :src="node.url"
                :alt="node.prompt"
                class="w-full h-20 object-cover rounded-xl transition"
                :class="nodeRingClass(node.id)"
              >
              <p class="text-[11px] mt-1.5 line-clamp-2 text-neutral-600 dark:text-neutral-400 leading-snug">
                {{ node.prompt }}
              </p>
            </button>
          </Motion>
        </div>
      </div>
    </div>

    <UAlert
      v-if="state.error"
      class="mt-3"
      color="error"
      variant="soft"
      :title="state.error.title"
      :description="state.error.hint"
      icon="i-lucide-alert-triangle"
      :actions="[
        { label: 'Réessayer', onClick: () => retryLast(), disabled: state.loading },
      ]"
    />

    <div class="py-4">
      <div class="surface-glass-strong rounded-2xl p-3 shadow-2xl shadow-violet-500/5 ring-1 ring-black/5 dark:ring-white/10">
        <PromptInput
          compact
          :loading="state.loading"
          :room-type="state.selectedBase?.roomType"
          placeholder="Affine l'agencement… (ex : ajoute une grande plante verte près de la fenêtre)"
          submit-label="Modifier"
          @submit="onSubmit"
        >
          <template #prefix>
            <UButton
              variant="soft"
              color="neutral"
              icon="i-lucide-arrow-left"
              :disabled="state.loading"
              @click="reset()"
            >
              <span class="hidden sm:inline">Changer</span>
            </UButton>
          </template>
        </PromptInput>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-img-enter-active,
.fade-img-leave-active {
  transition: opacity 0.3s ease;
}
.fade-img-enter-from,
.fade-img-leave-to {
  opacity: 0;
}
</style>
