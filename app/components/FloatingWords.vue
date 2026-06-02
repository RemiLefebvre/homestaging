<script setup lang="ts">
import { Motion } from 'motion-v'

const props = defineProps<{
  words: string[]
}>()

// Deterministic pseudo-random in [0,1) from a seed — keeps SSR/hydration stable
// and avoids Math.random, while spreading bubbles across the area.
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// One bubble per word; if there are few words we repeat them so the air stays full.
const bubbles = computed(() => {
  const source = props.words.length ? props.words : ['toi']
  const count = Math.max(source.length, 8)
  return Array.from({ length: count }, (_, i) => {
    const word = source[i % source.length]!
    return {
      word,
      key: `${i}-${word}`,
      left: 6 + rand(i + 1) * 84, // horizontal % position
      drift: (rand(i + 7) - 0.5) * 60, // slight sideways drift in px
      duration: 5 + rand(i + 3) * 3, // 5–8s rise
      delay: rand(i + 5) * 6, // staggered start so they don't bunch up
      scale: 0.85 + rand(i + 11) * 0.5, // size variety
    }
  })
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <Motion
      v-for="b in bubbles"
      :key="b.key"
      class="absolute whitespace-nowrap rounded-full bg-white/10 px-4 py-2 font-display font-medium text-white backdrop-blur-sm ring-1 ring-white/15"
      :style="{ left: `${b.left}%`, bottom: '-2rem', fontSize: `${b.scale}rem` }"
      :initial="{ opacity: 0, y: 0, x: 0 }"
      :animate="{
        opacity: [0, 0.9, 0.9, 0],
        y: ['0vh', '-85vh'],
        x: [0, b.drift],
      }"
      :transition="{
        duration: b.duration,
        delay: b.delay,
        repeat: Infinity,
        ease: 'easeOut',
        times: [0, 0.15, 0.7, 1],
      }"
    >
      {{ b.word }}
    </Motion>
  </div>
</template>
