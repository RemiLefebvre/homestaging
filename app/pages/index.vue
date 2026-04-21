<script setup lang="ts">
import type { BaseInterior } from '~~/shared/types/base-interior'

useHead({ title: 'Home staging — générateur d’intérieurs' })

const { state, selectBase, generateFromBase } = useImageGenerator()
const { messageFor, extractCode } = useGenerationError()

const { data, error } = await useFetch<{ items: BaseInterior[] }>('/api/base-interiors')

const loadError = computed(() => {
  if (!error.value) return null
  const code = extractCode(error.value)
  return messageFor(code)
})

function onBasePicked(base: BaseInterior) {
  selectBase(base)
}

function onFirstPrompt(prompt: string) {
  generateFromBase(prompt)
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <div class="max-w-5xl mx-auto px-4 py-10">
      <header class="mb-10">
        <h1 class="text-3xl font-bold mb-2">
          Home Staging
        </h1>
        <p class="text-neutral-600 dark:text-neutral-400">
          Choisis un intérieur vide, décris ton agencement, itère à l’infini.
        </p>
      </header>

      <UAlert
        v-if="loadError"
        class="mb-6"
        color="error"
        variant="soft"
        :title="loadError.title"
        :description="loadError.hint"
        icon="i-lucide-alert-triangle"
      />

      <!-- Étape 1 : sélection de base -->
      <BaseInteriorPicker
        v-if="!state.selectedBase"
        :items="data?.items ?? []"
        :disabled="state.loading"
        @select="onBasePicked"
      />

      <!-- Étape 2 : premier prompt -->
      <div v-else-if="!state.currentImageUrl && !state.loading" class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            2. Décris l’agencement souhaité
          </h2>
          <UButton
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="selectBase(state.selectedBase)"
          >
            Changer de base
          </UButton>
        </div>

        <img
          :src="`/base-interiors/${state.selectedBase.filename}`"
          :alt="state.selectedBase.label"
          class="w-full max-h-96 object-contain rounded-lg bg-neutral-100 dark:bg-neutral-900"
        >

        <UAlert
          v-if="state.error"
          color="error"
          variant="soft"
          :title="state.error.title"
          :description="state.error.hint"
          icon="i-lucide-alert-triangle"
        />

        <PromptInput
          :loading="state.loading"
          @submit="onFirstPrompt"
        />
      </div>

      <!-- Étape 2 en loading (affiche quand même l'image de base + loader) -->
      <div v-else-if="!state.currentImageUrl && state.loading" class="relative">
        <img
          :src="`/base-interiors/${state.selectedBase!.filename}`"
          :alt="state.selectedBase!.label"
          class="w-full max-h-96 object-contain rounded-lg bg-neutral-100 dark:bg-neutral-900"
        >
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900/60 backdrop-blur-sm text-white rounded-lg">
          <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin" />
          <p class="text-sm font-medium">Génération en cours… (~15-20s)</p>
        </div>
      </div>

      <!-- Étape 3 : édition infinie -->
      <GeneratedImageView v-else />
    </div>
  </div>
</template>
