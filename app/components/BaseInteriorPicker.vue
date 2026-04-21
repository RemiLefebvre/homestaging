<script setup lang="ts">
import type { BaseInterior } from '~~/shared/types/base-interior'

const props = defineProps<{
  items: BaseInterior[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [base: BaseInterior]
}>()

function pick(base: BaseInterior) {
  if (props.disabled) return
  emit('select', base)
}
</script>

<template>
  <div>
    <UAlert
      v-if="items.length === 0"
      color="warning"
      variant="soft"
      title="Aucune image de base"
      description="Dépose tes fichiers JPEG/PNG dans public/base-interiors/ et mets à jour manifest.json."
      icon="i-lucide-info"
    />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="base in items"
        :key="base.id"
        class="cursor-pointer transition hover:ring-2 hover:ring-primary-500"
        :class="{ 'opacity-50 cursor-not-allowed': disabled }"
        @click="pick(base)"
      >
        <img
          :src="`/base-interiors/${base.filename}`"
          :alt="base.label"
          class="w-full aspect-video object-cover rounded-md mb-3"
        >
        <h3 class="font-medium">{{ base.label }}</h3>
        <p v-if="base.description" class="text-sm text-neutral-500 mt-1">
          {{ base.description }}
        </p>
      </UCard>
    </div>
  </div>
</template>
