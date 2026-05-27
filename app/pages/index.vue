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

const currentStep = computed<1 | 2 | 3>(() => {
  if (!state.value.selectedBase) return 1
  if (!state.value.currentImageUrl) return 2
  return 3
})

function onBasePicked(base: BaseInterior) {
  selectBase(base)
}

function onFirstPrompt(prompt: string) {
  generateFromBase(prompt)
}
</script>

<template>
  <main class="relative">
    <UAlert
      v-if="loadError"
      class="max-w-7xl mx-auto mt-4 mx-4 sm:mx-auto sm:px-6"
      color="error"
      variant="soft"
      :title="loadError.title"
      :description="loadError.hint"
      icon="i-lucide-alert-triangle"
    />

    <!-- Étape 1 : sélection de base -->
    <template v-if="!state.selectedBase">
      <AppHero :base-count="data?.items?.length ?? 0" />
      <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div class="mb-6 flex justify-center">
          <StepIndicator :current="currentStep" />
        </div>
        <BaseInteriorPicker
          :items="data?.items ?? []"
          :disabled="state.loading"
          @select="onBasePicked"
        />
      </div>
    </template>

    <!-- Étape 2 : premier prompt (avec ou sans loader) -->
    <div
      v-else-if="!state.currentImageUrl"
      class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col h-[calc(100vh-3.5rem)]"
    >
      <div class="py-4 flex justify-center">
        <StepIndicator :current="currentStep" />
      </div>

      <div class="flex-1 min-h-0 relative rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-xl shadow-violet-500/5">
        <img
          :src="`/base-interiors/${state.selectedBase.filename}`"
          :alt="state.selectedBase.label"
          class="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-900"
        >
        <ProgressOverlay v-if="state.loading" />
      </div>

      <UAlert
        v-if="state.error"
        class="mt-3"
        color="error"
        variant="soft"
        :title="state.error.title"
        :description="state.error.hint"
        icon="i-lucide-alert-triangle"
      />

      <div class="py-4">
        <div class="surface-glass-strong rounded-2xl p-3 shadow-2xl shadow-violet-500/5 ring-1 ring-black/5 dark:ring-white/10">
          <PromptInput
            compact
            :loading="state.loading"
            :room-type="state.selectedBase.roomType"
            @submit="onFirstPrompt"
          >
            <template #prefix>
              <UButton
                variant="soft"
                color="neutral"
                icon="i-lucide-arrow-left"
                :disabled="state.loading"
                @click="reset()"
              >
                <span class="hidden sm:inline">Changer de base</span>
              </UButton>
            </template>
          </PromptInput>
        </div>
      </div>
    </div>

    <!-- Étape 3 : édition infinie -->
    <GeneratedImageView v-else />
  </main>
</template>
