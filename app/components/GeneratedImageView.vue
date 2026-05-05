<script setup lang="ts">
const { state, currentPathIds, refine, reset, revertTo, retryLast } = useImageGenerator()

function onSubmit(prompt: string) {
  refine(prompt)
}

function nodeClass(id: string) {
  if (id === state.currentId) return 'border-primary-500 ring-2 ring-primary-500/40'
  if (currentPathIds.value.has(id)) return 'border-primary-400'
  return 'border-transparent opacity-50 group-hover:opacity-80'
}
</script>

<template>
  <div class="flex flex-col h-screen">
    <div class="flex-1 min-h-0 flex gap-4 px-4 pt-4">
      <div class="flex-1 min-w-0 relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <img
          v-if="state.currentImageUrl"
          :src="state.currentImageUrl"
          alt="Intérieur généré"
          class="w-full h-full object-contain bg-neutral-100 dark:bg-neutral-900"
        >
        <div
          v-if="state.loading"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900/60 backdrop-blur-sm text-white"
        >
          <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin" />
          <p class="text-sm font-medium">Génération en cours… (~15-20s)</p>
        </div>
      </div>

      <div v-if="state.nodes.length > 1" class="w-36 shrink-0 flex flex-col overflow-hidden">
        <p class="text-xs font-medium mb-3 text-neutral-500 dark:text-neutral-400 shrink-0">
          {{ state.nodes.length }} versions
        </p>
        <div class="flex flex-col gap-3 overflow-y-auto flex-1">
          <button
            v-for="node in [...state.nodes].reverse()"
            :key="node.id"
            class="w-full text-left group"
            :disabled="state.loading"
            @click="revertTo(node.id)"
          >
            <img
              :src="node.url"
              :alt="node.prompt"
              class="w-full h-20 object-cover rounded border-2 transition"
              :class="nodeClass(node.id)"
            >
            <p class="text-xs mt-1 line-clamp-2 text-neutral-600 dark:text-neutral-400">
              {{ node.prompt }}
            </p>
          </button>
        </div>
      </div>
    </div>

    <UAlert
      v-if="state.error"
      class="mx-4 mt-2"
      color="error"
      variant="soft"
      :title="state.error.title"
      :description="state.error.hint"
      icon="i-lucide-alert-triangle"
      :actions="[
        { label: 'Réessayer', onClick: () => retryLast(), disabled: state.loading },
      ]"
    />

    <div class="py-3 border-t border-neutral-200 dark:border-neutral-800 mt-2">
      <PromptInput
        compact
        :loading="state.loading"
        :room-type="state.selectedBase?.roomType"
        placeholder="Affine l'agencement… (ex : ajoute une grande plante verte près de la fenêtre)"
        submit-label="Modifier"
        @submit="onSubmit"
      >
        <template #prefix>
          <UButton
            icon="i-lucide-arrow-left"
            :disabled="state.loading"
            @click="reset()"
          >
            Changer de base
          </UButton>
        </template>
      </PromptInput>
    </div>
  </div>
</template>
