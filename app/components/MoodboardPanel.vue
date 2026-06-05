<script setup lang="ts">
import type { Fragment } from '~~/shared/types/architect'
import { Motion } from 'motion-v'

const props = defineProps<{
  fragments: readonly Fragment[]
  total: number
}>()

// One slot per expected answer; each fills with its fragment colour as the
// quiz progresses (#7 construction progress + #8 palette, combined).
const slots = computed(() =>
  Array.from({ length: props.total }, (_, i) => props.fragments[i] ?? null),
)

const built = computed(() => props.fragments.length)
const done = computed(() => built.value >= props.total)
</script>

<template>
  <div class="py-3 space-y-3">
    <!-- Construction + palette : chaque réponse pose une pierre colorée -->
    <div class="flex items-center gap-2.5">
      <div class="flex-1 flex items-center gap-1.5">
        <div
          v-for="(frag, i) in slots"
          :key="i"
          class="h-7 flex-1 rounded-lg overflow-hidden"
        >
          <Motion
            v-if="frag"
            class="h-full w-full rounded-lg shadow-sm ring-1 ring-black/5"
            :style="{ backgroundColor: frag.color }"
            :initial="{ scaleY: 0, opacity: 0 }"
            :animate="{ scaleY: 1, opacity: 1 }"
            :transition="{ type: 'spring', stiffness: 300, damping: 22 }"
          />
          <div
            v-else
            class="h-full w-full rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-800"
          />
        </div>
      </div>

      <!-- La maison « s'allume » une fois la palette complète -->
      <Motion
        class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-700"
        :class="done
          ? 'bg-gradient-brand shadow-md shadow-violet-500/30'
          : 'bg-neutral-100 dark:bg-neutral-800'"
        :animate="done ? { scale: [1, 1.18, 1] } : { scale: 1 }"
        :transition="{ duration: 0.5 }"
      >
        <UIcon
          name="i-lucide-home"
          class="h-4 w-4 transition-colors duration-700"
          :class="done ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'"
        />
      </Motion>
    </div>

    <!-- Moodboard : une carte par réponse (#6) -->
    <div
      v-if="built > 0"
      class="grid grid-cols-5 gap-2"
    >
      <Motion
        v-for="(frag, i) in fragments"
        :key="i"
        class="surface-glass rounded-xl p-2.5 flex flex-col gap-1.5 min-w-0"
        :initial="{ opacity: 0, y: 10, scale: 0.95 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ type: 'spring', stiffness: 260, damping: 20 }"
      >
        <div class="flex items-center gap-1.5">
          <span
            class="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
            :style="{ backgroundColor: frag.color }"
          />
          <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            {{ frag.colorName }}
          </span>
        </div>
        <span class="text-sm font-semibold capitalize text-neutral-800 dark:text-neutral-100 break-words">
          {{ frag.keyword }}
        </span>
        <span class="inline-flex items-start gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          <UIcon name="i-lucide-layers" class="h-3 w-3 shrink-0 mt-0.5" />
          <span class="break-words">{{ frag.material }}</span>
        </span>
      </Motion>
    </div>
  </div>
</template>
