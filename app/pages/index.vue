<script setup lang="ts">
import type { BaseInterior } from '~~/shared/types/base-interior'

useHead({ title: 'Home staging — générateur d’intérieurs' })

const { state, selectBase, generateFromBase, reset } = useImageGenerator()
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
    <div class="mx-auto">
      <UAlert
        v-if="loadError"
        class="mb-6 mx-4"
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
      <div v-else-if="!state.currentImageUrl && !state.loading" class="flex flex-col h-screen">
        <div class="flex-1 min-h-0 p-4">
          <img
            :src="`/base-interiors/${state.selectedBase.filename}`"
            :alt="state.selectedBase.label"
            class="w-full h-full object-contain rounded-lg bg-neutral-100 dark:bg-neutral-900"
          >
        </div>

        <UAlert
          v-if="state.error"
          class="mx-4 mb-2"
          color="error"
          variant="soft"
          :title="state.error.title"
          :description="state.error.hint"
          icon="i-lucide-alert-triangle"
        />

        <div class="h-[10vh] flex items-center gap-3 px-4 border-t border-neutral-200 dark:border-neutral-800">
          <UButton icon="i-lucide-arrow-left" @click="reset()">
            Changer de base
          </UButton>
          <PromptInput
            compact
            :loading="state.loading"
            class="flex-1"
            @submit="onFirstPrompt"
          />
        </div>
      </div>

      <!-- Étape 2 en loading (affiche quand même l'image de base + loader) -->
      <div v-else-if="!state.currentImageUrl && state.loading" class="flex flex-col h-screen">
        <div class="flex-1 min-h-0 p-4 relative">
          <img
            :src="`/base-interiors/${state.selectedBase!.filename}`"
            :alt="state.selectedBase!.label"
            class="w-full h-full object-contain rounded-lg bg-neutral-100 dark:bg-neutral-900"
          >
          <div class="absolute inset-4 flex flex-col items-center justify-center gap-3 bg-neutral-900/60 backdrop-blur-sm text-white rounded-lg">
            <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin" />
            <p class="text-sm font-medium">Génération en cours… (~15-20s)</p>
          </div>
        </div>
        <div class="h-[10vh]" />
      </div>

      <!-- Étape 3 : édition infinie -->
      <GeneratedImageView v-else />
    </div>
  </div>
</template>
