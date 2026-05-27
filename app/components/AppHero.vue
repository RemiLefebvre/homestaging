<script setup lang="ts">
import { Motion } from 'motion-v'

defineProps<{
  baseCount: number
}>()
</script>

<template>
  <section class="relative px-4 sm:px-6 pt-10 pb-8 sm:pt-16 sm:pb-12">
    <div class="max-w-7xl mx-auto text-center">
      <Motion
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0 }"
      >
        <span class="inline-flex items-center gap-2 rounded-full surface-glass px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 ring-1 ring-violet-500/20">
          <span class="relative flex h-1.5 w-1.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
          </span>
          Powered by Nano Banana
        </span>
      </Motion>

      <Motion
        as="h1"
        class="font-display mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance"
        :initial="{ opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.08 }"
      >
        Réagencez vos intérieurs<br>
        <span class="text-gradient-brand">en quelques secondes.</span>
      </Motion>

      <Motion
        as="p"
        class="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-neutral-600 dark:text-neutral-400 text-pretty"
        :initial="{ opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.16 }"
      >
        Choisissez une pièce vide, décrivez l'ambiance que vous voulez, l'IA s'occupe du reste.
        Iterez à l'infini sur chaque génération jusqu'à trouver le rendu parfait.
      </Motion>

      <Motion
        class="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-neutral-500 dark:text-neutral-400"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :transition="{ duration: 0.5, delay: 0.24 }"
      >
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-lucide-image" class="h-4 w-4 text-violet-500" />
          <strong class="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">{{ baseCount }}</strong>
          intérieurs prêts à l'emploi
        </span>
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-lucide-zap" class="h-4 w-4 text-fuchsia-500" />
          <strong class="font-semibold text-neutral-900 dark:text-neutral-100">~15&#8239;s</strong>
          par génération
        </span>
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-lucide-infinity" class="h-4 w-4 text-cyan-500" />
          Itérations illimitées
        </span>
      </Motion>
    </div>
  </section>
</template>
