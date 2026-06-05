<script setup lang="ts">
import { Motion } from 'motion-v'

useHead({ title: 'Dis-moi qui tu es, je construis ta maison' })

const { state, start, profileWords, quickTest } = useArchitect()
const isDev = import.meta.dev

const { data: gallery } = await useFetch<{ images: string[] }>('/api/gallery')
const galleryImages = computed(() => gallery.value?.images ?? [])
</script>

<template>
  <main class="relative">
    <!-- Intro -->
    <section
      v-if="state.phase === 'intro'"
      class="relative min-h-[calc(100vh-3.5rem)] overflow-hidden"
    >
      <WelcomeGallery
        :images="galleryImages"
        class="absolute inset-0 px-4 py-8"
      />

      <div class="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center">
        <Motion
          :initial="{ opacity: 0, y: 16 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5 }"
          :class="galleryImages.length > 0 ? 'surface-glass-strong rounded-3xl px-8 py-12 ring-1 ring-white/10 shadow-2xl' : ''"
        >
          <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-xl shadow-violet-500/30 mb-6">
            <UIcon name="i-lucide-sparkles" class="h-7 w-7 text-white" />
          </span>
          <h1 class="font-display text-3xl sm:text-5xl font-bold leading-tight">
            Dis-moi qui tu es,<br>
            <span class="text-gradient-brand">je construis ta maison.</span>
          </h1>
          <p class="mt-5 text-lg text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Réponds à 5 questions. À partir de ta personnalité, notre architecte imagine
            l'extérieur de la maison qui te ressemble.
          </p>

          <button
            type="button"
            class="mt-8 inline-flex items-center gap-2 rounded-xl px-7 py-4 text-base font-semibold text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50"
            :disabled="state.loading"
            @click="start()"
          >
            <UIcon
              :name="state.loading ? 'i-lucide-loader-2' : 'i-lucide-message-circle'"
              :class="['h-5 w-5', state.loading && 'animate-spin']"
            />
            Commencer la conversation
          </button>

          <button
            v-if="isDev"
            type="button"
            class="mt-4 ml-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 ring-1 ring-neutral-300 hover:bg-neutral-100 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            :disabled="state.loading"
            @click="quickTest()"
          >
            <UIcon name="i-lucide-zap" class="h-3.5 w-3.5" />
            Test rapide (dev)
          </button>
        </Motion>

        <UAlert
          v-if="state.error"
          class="mt-6 max-w-md"
          color="error"
          variant="soft"
          :title="state.error.title"
          :description="state.error.hint"
          icon="i-lucide-alert-triangle"
        />
      </div>
    </section>

    <!-- Conversation -->
    <ConversationChat v-else-if="state.phase === 'chat'" />

    <!-- Generation -->
    <section
      v-else-if="state.phase === 'generating'"
      class="max-w-2xl mx-auto px-4 sm:px-6 h-[calc(100vh-3.5rem)] relative"
    >
      <div class="absolute inset-4 overflow-hidden rounded-3xl bg-neutral-100/40 dark:bg-neutral-900/40">
        <ProgressOverlay
          message="Construction en cours"
          hint="Notre architecte dessine ta maison…"
          :profile="state.profile"
        />
        <FloatingWords :words="profileWords" class="z-20" />
      </div>
    </section>

    <!-- Result -->
    <HouseResult v-else-if="state.phase === 'result'" />
  </main>
</template>
