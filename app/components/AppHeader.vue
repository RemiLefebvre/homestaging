<script setup lang="ts">
const colorMode = useColorMode()
const { state, reset } = useArchitect()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light' },
})

function toggleTheme() {
  isDark.value = !isDark.value
}
</script>

<template>
  <header class="sticky top-0 z-40">
    <div class="surface-glass-strong border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <span class="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand shadow-lg shadow-violet-500/30 transition group-hover:scale-105">
            <UIcon name="i-lucide-sparkles" class="h-4 w-4 text-white" />
          </span>
          <span class="font-display text-lg font-bold leading-none">
            your<span class="text-gradient-brand">house</span>
          </span>
        </NuxtLink>

        <span class="hidden sm:inline-block h-5 w-px bg-neutral-300/60 dark:bg-neutral-700/60" />
        <p class="hidden sm:block text-sm text-neutral-500 dark:text-neutral-400">
          Tell me who you are, I'll build your house
        </p>

        <div class="ml-auto flex items-center gap-2">
          <UButton
            v-if="state.phase !== 'intro'"
            variant="ghost"
            color="neutral"
            icon="i-lucide-rotate-ccw"
            :disabled="state.loading"
            @click="reset()"
          >
            <span class="hidden sm:inline">Start over</span>
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          />
        </div>
      </div>
    </div>
  </header>
</template>
