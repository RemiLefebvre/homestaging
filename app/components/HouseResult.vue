<script setup lang="ts">
import { Motion } from 'motion-v'

const { state, reset } = useArchitect()

const materials = computed(() => state.value.brief?.materials ?? [])
const story = computed(() => state.value.brief?.story ?? [])
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
    <!-- Quiet title: the architectural stance -->
    <Motion
      v-if="state.brief"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4 }"
      class="text-center mb-6"
    >
      <h1 class="font-display text-xl sm:text-2xl font-medium tracking-tight text-neutral-700 dark:text-neutral-200">
        {{ state.brief.style }}
      </h1>
    </Motion>

    <!-- House image -->
    <Motion
      :initial="{ opacity: 0, scale: 0.98 }"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.5, delay: 0.1 }"
      class="relative rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-2xl shadow-violet-500/10"
    >
      <img
        v-if="state.imageUrl"
        :src="state.imageUrl"
        alt="La maison qui te ressemble"
        class="w-full object-cover bg-neutral-100 dark:bg-neutral-900"
      >
    </Motion>

    <!-- Intent note -->
    <Motion
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.2 }"
      class="surface-glass rounded-2xl p-6 mt-6"
    >
      <p class="text-xs uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-semibold mb-3">
        Note d'intention
      </p>
      <p class="text-neutral-800 dark:text-neutral-100 leading-relaxed">
        {{ state.concept }}
      </p>

      <div v-if="state.brief" class="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <p class="text-neutral-400 dark:text-neutral-500 mb-1">Matières</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="m in materials"
              :key="m"
              class="px-2.5 py-1 rounded-full ring-1 ring-black/5 dark:ring-white/10 bg-white/70 dark:bg-neutral-900/60"
            >
              {{ m }}
            </span>
          </div>
        </div>
        <div>
          <p class="text-neutral-400 dark:text-neutral-500 mb-1">Palette &amp; cadre</p>
          <p class="text-neutral-700 dark:text-neutral-300">{{ state.brief.palette }} — {{ state.brief.environment }}</p>
        </div>
      </div>
    </Motion>

    <!-- Why this house looks like you -->
    <Motion
      v-if="story.length"
      :initial="{ opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, delay: 0.3 }"
      class="surface-glass rounded-2xl p-6 mt-6"
    >
      <p class="text-xs uppercase tracking-widest text-violet-500 dark:text-violet-400 font-semibold mb-4">
        Pourquoi cette maison te ressemble
      </p>
      <ul class="space-y-5">
        <li
          v-for="(beat, i) in story"
          :key="i"
          class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
        >
          <span class="font-display font-semibold text-violet-600 dark:text-violet-300 shrink-0 sm:w-1/3">
            {{ beat.trigger }}
          </span>
          <span class="text-neutral-700 dark:text-neutral-200 leading-relaxed">
            <span v-if="beat.meaning" class="italic text-neutral-500 dark:text-neutral-400">
              {{ beat.meaning }}.
            </span>
            <span v-if="beat.meaning"> </span>{{ beat.design }}
          </span>
        </li>
      </ul>
    </Motion>

    <!-- Actions -->
    <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
      <a
        v-if="state.imageUrl"
        :href="state.imageUrl"
        download
        class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all"
      >
        <UIcon name="i-lucide-download" class="h-4 w-4" />
        Télécharger l'image
      </a>
      <UButton
        size="lg"
        variant="soft"
        color="neutral"
        icon="i-lucide-rotate-ccw"
        @click="reset()"
      >
        Recommencer
      </UButton>
    </div>
  </div>
</template>
