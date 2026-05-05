<script setup lang="ts">
import {
  ROOM_TYPE_LABELS,
  ROOM_TYPE_ORDER,
  type BaseInterior,
  type RoomType,
} from '~~/shared/types/base-interior'

const props = defineProps<{
  items: BaseInterior[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [base: BaseInterior]
}>()

const groupedItems = computed(() => {
  const groups = new Map<RoomType, BaseInterior[]>()
  for (const item of props.items) {
    const type = item.roomType ?? 'multipurpose'
    const list = groups.get(type) ?? []
    list.push(item)
    groups.set(type, list)
  }
  return ROOM_TYPE_ORDER
    .filter(type => groups.has(type))
    .map(type => ({ type, label: ROOM_TYPE_LABELS[type], bases: groups.get(type)! }))
})

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

    <div v-else class="flex flex-col gap-6">
      <section v-for="group in groupedItems" :key="group.type">
        <h2 class="px-4 pt-4 pb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {{ group.label }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800">
          <div
            v-for="base in group.bases"
            :key="base.id"
            class="cursor-pointer overflow-hidden bg-white dark:bg-neutral-900 transition hover:brightness-95 active:brightness-90"
            :class="{ 'opacity-50 cursor-not-allowed': disabled }"
            @click="pick(base)"
          >
            <img
              :src="`/base-interiors/${base.filename}`"
              :alt="base.label"
              class="w-full aspect-4/3 object-cover"
            >
            <div class="px-4 py-3">
              <h3 class="font-medium">{{ base.label }}</h3>
              <p v-if="base.description" class="text-sm text-neutral-500 mt-1">
                {{ base.description }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
