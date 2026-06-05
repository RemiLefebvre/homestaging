<script setup lang="ts">
const props = defineProps<{
  images: string[]
}>()

const COLUMN_COUNT = 3
const DURATIONS = ['60s', '90s', '75s']
const OFFSETS = ['0px', '-120px', '-60px']

const columns = computed(() => {
  const buckets: string[][] = Array.from({ length: COLUMN_COUNT }, () => [])
  props.images.forEach((src, i) => {
    buckets[i % COLUMN_COUNT]!.push(src)
  })
  return buckets.map((items) => {
    // Need at least 2 items to make the duplicated loop feel full.
    if (items.length === 0) return items
    if (items.length === 1) return [...items, ...items]
    return items
  })
})
</script>

<template>
  <div
    v-if="images.length > 0"
    aria-hidden="true"
    class="pointer-events-none overflow-hidden gallery-mask"
  >
    <div class="grid grid-cols-3 gap-4 h-full">
      <div
        v-for="(items, colIdx) in columns"
        :key="colIdx"
        class="overflow-hidden"
        :style="{ marginTop: OFFSETS[colIdx] }"
      >
        <div
          class="gallery-scroll flex flex-col gap-4"
          :style="{ '--gallery-duration': DURATIONS[colIdx] }"
        >
          <!-- Content duplicated twice so the -50% loop point is seamless. -->
          <img
            v-for="(src, i) in [...items, ...items]"
            :key="`${colIdx}-${i}-${src}`"
            :src="src"
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
            class="w-full aspect-square object-cover rounded-2xl opacity-60"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-mask {
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 15%,
    black 85%,
    transparent 100%
  );
}
</style>
