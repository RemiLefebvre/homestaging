<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

const props = defineProps<{
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
}>()

const position = ref(50)
const dragging = ref(false)
const containerRef = ref<HTMLElement | null>(null)

function setPositionFromClientX(clientX: number) {
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const ratio = ((clientX - rect.left) / rect.width) * 100
  position.value = Math.max(0, Math.min(100, ratio))
}

function startDrag(e: MouseEvent | TouchEvent) {
  dragging.value = true
  if ('clientX' in e) setPositionFromClientX(e.clientX)
  else if (e.touches[0]) setPositionFromClientX(e.touches[0].clientX)
}

useEventListener('mousemove', (e: MouseEvent) => {
  if (dragging.value) setPositionFromClientX(e.clientX)
})
useEventListener('touchmove', (e: TouchEvent) => {
  if (dragging.value && e.touches[0]) setPositionFromClientX(e.touches[0].clientX)
}, { passive: true })
useEventListener('mouseup', () => { dragging.value = false })
useEventListener('touchend', () => { dragging.value = false })

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    position.value = Math.max(0, position.value - (e.shiftKey ? 10 : 2))
  }
  else if (e.key === 'ArrowRight') {
    e.preventDefault()
    position.value = Math.min(100, position.value + (e.shiftKey ? 10 : 2))
  }
  else if (e.key === 'Home') {
    e.preventDefault()
    position.value = 0
  }
  else if (e.key === 'End') {
    e.preventDefault()
    position.value = 100
  }
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full h-full select-none overflow-hidden rounded-3xl bg-neutral-100 dark:bg-neutral-900 cursor-ew-resize"
    @mousedown="startDrag"
    @touchstart="startDrag"
  >
    <img
      :src="props.beforeUrl"
      :alt="props.beforeLabel ?? 'Avant'"
      class="absolute inset-0 w-full h-full object-contain pointer-events-none"
      draggable="false"
    >
    <img
      :src="props.afterUrl"
      :alt="props.afterLabel ?? 'Après'"
      class="absolute inset-0 w-full h-full object-contain pointer-events-none"
      :style="{ clipPath: `inset(0 ${100 - position}% 0 0)` }"
      draggable="false"
    >

    <span class="pointer-events-none absolute top-3 left-3 text-xs font-semibold uppercase tracking-wider text-white px-2.5 py-1 rounded-full bg-neutral-900/70 backdrop-blur-sm ring-1 ring-white/10">
      {{ props.beforeLabel ?? 'Avant' }}
    </span>
    <span class="pointer-events-none absolute top-3 right-3 text-xs font-semibold uppercase tracking-wider text-white px-2.5 py-1 rounded-full bg-gradient-brand ring-1 ring-white/20 shadow-md shadow-violet-500/30">
      {{ props.afterLabel ?? 'Après' }}
    </span>

    <div
      class="absolute top-0 bottom-0 w-px bg-white shadow-[0_0_20px_rgba(139,92,246,0.7)] pointer-events-none"
      :style="{ left: `${position}%` }"
    />
    <button
      type="button"
      role="slider"
      aria-label="Comparer avant et après"
      :aria-valuenow="Math.round(position)"
      aria-valuemin="0"
      aria-valuemax="100"
      class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white shadow-2xl shadow-violet-500/40 ring-2 ring-violet-500 flex items-center justify-center cursor-ew-resize hover:scale-110 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/40"
      :style="{ left: `${position}%` }"
      tabindex="0"
      @keydown="onKeydown"
    >
      <UIcon name="i-lucide-arrow-left-right" class="h-5 w-5 text-violet-600" />
    </button>
  </div>
</template>
