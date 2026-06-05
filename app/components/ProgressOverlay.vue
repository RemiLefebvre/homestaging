<script setup lang="ts">
import { Motion } from 'motion-v'

withDefaults(defineProps<{
  message?: string
  hint?: string
  profile?: string | null
}>(), {
  message: 'Generating',
  hint: '~15-20 seconds',
  profile: null,
})

// Orbiting particles: distinct size, distance from centre, speed and opacity
const orbits = [
  { id: 1, size: 6, inset: 4, duration: 3.2, opacity: 0.9 },
  { id: 2, size: 4, inset: 14, duration: 4.6, opacity: 0.6 },
  { id: 3, size: 5, inset: 24, duration: 2.4, opacity: 0.75 },
]
</script>

<template>
  <Motion
    class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 rounded-3xl backdrop-blur-2xl bg-neutral-950/55 dark:bg-black/65"
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    :exit="{ opacity: 0 }"
    :transition="{ duration: 0.3 }"
  >
    <div class="relative flex h-32 w-32 items-center justify-center">
      <!-- Pulsing glow halo -->
      <Motion
        class="absolute h-24 w-24 rounded-full bg-gradient-brand blur-2xl"
        :animate="{ scale: [1, 1.35, 1], opacity: [0.35, 0.65, 0.35] }"
        :transition="{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }"
      />

      <!-- Orbiting particles -->
      <Motion
        v-for="o in orbits"
        :key="o.id"
        class="absolute inset-0"
        :animate="{ rotate: 360 }"
        :transition="{ duration: o.duration, repeat: Infinity, ease: 'linear' }"
      >
        <span
          class="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-white shadow-lg shadow-violet-400/60"
          :style="{ height: `${o.size}px`, width: `${o.size}px`, marginTop: `${o.inset}px`, opacity: o.opacity }"
        />
      </Motion>

      <!-- Breathing central orb -->
      <Motion
        class="relative h-14 w-14 overflow-hidden rounded-full bg-gradient-brand shadow-2xl shadow-violet-500/60"
        :animate="{ scale: [1, 1.12, 1] }"
        :transition="{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }"
      >
        <!-- Highlight for the sphere effect -->
        <span class="absolute left-2.5 top-2 h-4 w-4 rounded-full bg-white/70 blur-[6px]" />
      </Motion>
    </div>

    <!-- Inferred profile: appears as soon as the architect has spoken, BEFORE the image lands. -->
    <Motion
      v-if="profile"
      key="profile"
      class="px-6 max-w-md text-center"
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: 'easeOut' }"
    >
      <p class="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-violet-300 font-semibold mb-2">
        Inferred profile
      </p>
      <p class="font-display text-base sm:text-lg leading-snug text-white">
        {{ profile }}
      </p>
    </Motion>

    <div class="text-center text-white">
      <p class="font-display text-lg font-semibold">{{ message }}</p>
      <p class="mt-1 text-sm text-white/70">{{ hint }}</p>
    </div>

    <div class="relative h-1 w-56 overflow-hidden rounded-full bg-white/10">
      <div class="absolute inset-0 shimmer" />
    </div>
  </Motion>
</template>
