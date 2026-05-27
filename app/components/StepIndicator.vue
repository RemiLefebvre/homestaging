<script setup lang="ts">
const props = defineProps<{
  current: 1 | 2 | 3
}>()

const steps = [
  { id: 1, label: 'Choisir une base' },
  { id: 2, label: 'Décrire l\'agencement' },
  { id: 3, label: 'Affiner' },
] as const
</script>

<template>
  <ol class="flex items-center gap-2 text-sm">
    <template v-for="(step, i) in steps" :key="step.id">
      <li class="flex items-center gap-2">
        <span
          class="inline-flex h-7 w-7 items-center justify-center rounded-full font-semibold text-xs transition-all"
          :class="step.id < props.current
            ? 'bg-gradient-brand text-white shadow-md shadow-violet-500/30'
            : step.id === props.current
              ? 'bg-gradient-brand text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-500/30 ring-offset-2 ring-offset-transparent'
              : 'bg-neutral-200/70 dark:bg-neutral-800/70 text-neutral-500'"
        >
          <UIcon v-if="step.id < props.current" name="i-lucide-check" class="h-3.5 w-3.5" />
          <template v-else>{{ step.id }}</template>
        </span>
        <span
          class="hidden sm:inline font-medium transition-colors"
          :class="step.id <= props.current ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-600'"
        >
          {{ step.label }}
        </span>
      </li>
      <li
        v-if="i < steps.length - 1"
        aria-hidden="true"
        class="h-px w-6 sm:w-10 transition-colors"
        :class="step.id < props.current ? 'bg-gradient-brand' : 'bg-neutral-200 dark:bg-neutral-800'"
      />
    </template>
  </ol>
</template>
