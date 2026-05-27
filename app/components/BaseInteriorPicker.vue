<script setup lang="ts">
import { Motion } from 'motion-v'
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

type Filter = RoomType | 'all'

const activeFilter = ref<Filter>('all')

const availableTypes = computed<RoomType[]>(() => {
  const set = new Set<RoomType>()
  for (const item of props.items) set.add(item.roomType ?? 'multipurpose')
  return ROOM_TYPE_ORDER.filter(t => set.has(t))
})

const filters = computed<{ value: Filter, label: string, count: number }[]>(() => {
  const all = { value: 'all' as const, label: 'Tous', count: props.items.length }
  const others = availableTypes.value.map(type => ({
    value: type,
    label: ROOM_TYPE_LABELS[type],
    count: props.items.filter(i => (i.roomType ?? 'multipurpose') === type).length,
  }))
  return [all, ...others]
})

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return props.items
  return props.items.filter(i => (i.roomType ?? 'multipurpose') === activeFilter.value)
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

    <template v-else>
      <div class="mb-6 flex justify-center">
        <div class="surface-glass rounded-full p-1 flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-full">
          <button
            v-for="f in filters"
            :key="f.value"
            type="button"
            class="shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200"
            :class="activeFilter === f.value
              ? 'bg-gradient-brand text-white shadow-md shadow-violet-500/30 scale-105'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
            <span
              class="text-xs tabular-nums"
              :class="activeFilter === f.value ? 'text-white/80' : 'text-neutral-400 dark:text-neutral-500'"
            >
              {{ f.count }}
            </span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Motion
          v-for="(base, i) in filteredItems"
          :key="base.id"
          :initial="{ opacity: 0, y: 16 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: Math.min(i * 0.04, 0.5) }"
        >
          <button
            type="button"
            class="group relative w-full text-left rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            :class="disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:-translate-y-1 hover:ring-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/20 cursor-pointer'"
            :disabled="disabled"
            @click="pick(base)"
          >
            <div class="relative aspect-4/3 overflow-hidden">
              <img
                :src="`/base-interiors/${base.filename}`"
                :alt="base.label"
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              >
              <div class="absolute top-3 left-3">
                <span class="surface-glass rounded-full px-2.5 py-0.5 text-[11px] font-medium text-neutral-800 dark:text-neutral-100 ring-1 ring-black/5 dark:ring-white/10">
                  {{ ROOM_TYPE_LABELS[base.roomType ?? 'multipurpose'] }}
                </span>
              </div>
              <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div class="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <span class="text-sm font-semibold">Choisir cet intérieur</span>
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-violet-600">
                  <UIcon name="i-lucide-arrow-right" class="h-4 w-4" />
                </span>
              </div>
            </div>
            <div class="px-4 py-3">
              <h3 class="font-medium text-neutral-900 dark:text-neutral-100">{{ base.label }}</h3>
              <p v-if="base.description" class="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                {{ base.description }}
              </p>
            </div>
          </button>
        </Motion>
      </div>
    </template>
  </div>
</template>
