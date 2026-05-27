<script setup lang="ts">
import { Motion } from 'motion-v'

withDefaults(defineProps<{
  message?: string
  hint?: string
}>(), {
  message: 'Génération en cours',
  hint: '~15-20 secondes',
})
</script>

<template>
  <Motion
    class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 rounded-3xl backdrop-blur-2xl bg-neutral-950/55 dark:bg-black/65"
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    :exit="{ opacity: 0 }"
    :transition="{ duration: 0.3 }"
  >
    <div class="relative h-24 w-24">
      <Motion
        v-for="i in 3"
        :key="i"
        class="absolute inset-0 rounded-full border-2 border-violet-400/60"
        :initial="{ scale: 0.4, opacity: 0.8 }"
        :animate="{ scale: 1.4, opacity: 0 }"
        :transition="{
          duration: 1.6,
          repeat: Infinity,
          delay: (i - 1) * 0.5,
          ease: 'easeOut',
        }"
      />
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="h-10 w-10 rounded-full bg-gradient-brand shadow-2xl shadow-violet-500/50" />
      </div>
    </div>

    <div class="text-center text-white">
      <p class="font-display text-lg font-semibold">{{ message }}</p>
      <p class="mt-1 text-sm text-white/70">{{ hint }}</p>
    </div>

    <div class="relative h-1 w-56 overflow-hidden rounded-full bg-white/10">
      <div class="absolute inset-0 shimmer" />
    </div>
  </Motion>
</template>
