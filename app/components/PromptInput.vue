<script setup lang="ts">
const props = defineProps<{
  loading: boolean
  placeholder?: string
  submitLabel?: string
}>()

const emit = defineEmits<{
  submit: [prompt: string]
}>()

const prompt = ref('')

const canSubmit = computed(() => !props.loading && prompt.value.trim().length > 0)

function handleSubmit() {
  if (!canSubmit.value) return
  const value = prompt.value.trim()
  emit('submit', value)
  prompt.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <UTextarea
      v-model="prompt"
      :placeholder="placeholder ?? 'Décris comment agencer la pièce… (canapé, table, plantes, ambiance…)'"
      :rows="3"
      :disabled="loading"
      autoresize
      @keydown="onKeydown"
    />
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs text-neutral-500">
        Cmd/Ctrl + Enter pour envoyer
      </span>
      <UButton
        icon="i-lucide-sparkles"
        :loading="loading"
        :disabled="!canSubmit"
        color="primary"
        @click="handleSubmit"
      >
        {{ submitLabel ?? 'Générer' }}
      </UButton>
    </div>
  </div>
</template>
