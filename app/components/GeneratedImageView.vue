<script setup lang="ts">
const { state, refine, reset, revertTo, retryLast } = useImageGenerator()

function onSubmit(prompt: string) {
  refine(prompt)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">
        3. Modifie l’agencement à l’infini
      </h2>
      <UButton
        variant="ghost"
        icon="i-lucide-rotate-ccw"
        :disabled="state.loading"
        @click="reset"
      >
        Recommencer
      </UButton>
    </div>

    <div class="relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
      <img
        v-if="state.currentImageUrl"
        :src="state.currentImageUrl"
        alt="Intérieur généré"
        class="w-full object-contain bg-neutral-100 dark:bg-neutral-900"
      >
      <div
        v-if="state.loading"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900/60 backdrop-blur-sm text-white"
      >
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin" />
        <p class="text-sm font-medium">Génération en cours… (~15-20s)</p>
      </div>
    </div>

    <UAlert
      v-if="state.error"
      color="error"
      variant="soft"
      :title="state.error.title"
      :description="state.error.hint"
      icon="i-lucide-alert-triangle"
      :actions="[
        { label: 'Réessayer', onClick: () => retryLast(), disabled: state.loading },
      ]"
    />

    <PromptInput
      :loading="state.loading"
      placeholder="Affine l’agencement… (ex : ajoute une grande plante verte près de la fenêtre)"
      submit-label="Modifier"
      @submit="onSubmit"
    />

    <div v-if="state.history.length > 1" class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
      <h3 class="text-sm font-medium mb-3 text-neutral-600 dark:text-neutral-400">
        Historique ({{ state.history.length }} itérations)
      </h3>
      <div class="flex gap-3 overflow-x-auto pb-2">
        <button
          v-for="(entry, idx) in state.history"
          :key="entry.url"
          class="flex-shrink-0 w-32 text-left group"
          :disabled="state.loading"
          @click="revertTo(idx)"
        >
          <img
            :src="entry.url"
            :alt="entry.prompt"
            class="w-32 h-24 object-cover rounded border-2 transition"
            :class="entry.url === state.currentImageUrl
              ? 'border-primary-500'
              : 'border-transparent group-hover:border-primary-300'"
          >
          <p class="text-xs mt-1 line-clamp-2 text-neutral-600 dark:text-neutral-400">
            {{ entry.prompt }}
          </p>
        </button>
      </div>
    </div>
  </div>
</template>
