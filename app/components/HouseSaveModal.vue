<script setup lang="ts">
import { reactive } from 'vue'
import type { FormSubmitEvent } from '@nuxt/ui'
import { leadFormSchema, type LeadForm } from '~~/shared/types/lead'

const open = defineModel<boolean>('open', { default: false })

const { state, saveHouse } = useArchitect()

const form = reactive<LeadForm>({ firstName: '', lastName: '', email: '' })

async function onSubmit(event: FormSubmitEvent<LeadForm>) {
  // On success, state.validated flips → the modal swaps to the thank-you view.
  await saveHouse(event.data)
}
</script>

<template>
  <UModal v-model:open="open" title="Crée ta maison" :dismissible="!state.loading">
    <template #body>
      <!-- Thank-you (after validation) -->
      <div v-if="state.validated" class="text-center py-4">
        <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-xl shadow-violet-500/30 mb-4">
          <UIcon name="i-lucide-check" class="h-7 w-7 text-white" />
        </span>
        <p class="text-lg font-medium text-neutral-800 dark:text-neutral-100">
          Merci d'avoir créé votre maison avec FLAA
        </p>
        <UButton class="mt-6" size="lg" variant="soft" color="neutral" @click="open = false">
          Fermer
        </UButton>
      </div>

      <!-- Contact form -->
      <UForm
        v-else
        :schema="leadFormSchema"
        :state="form"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Prénom" name="firstName">
          <UInput v-model="form.firstName" class="w-full" autocomplete="given-name" />
        </UFormField>
        <UFormField label="Nom" name="lastName">
          <UInput v-model="form.lastName" class="w-full" autocomplete="family-name" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="form.email" type="email" class="w-full" autocomplete="email" />
        </UFormField>

        <UAlert
          v-if="state.error"
          color="error"
          variant="soft"
          :title="state.error.title"
          :description="state.error.hint"
          icon="i-lucide-alert-triangle"
        />

        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-gradient-brand shadow-lg shadow-violet-500/30 hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50"
            :disabled="state.loading"
          >
            <UIcon
              :name="state.loading ? 'i-lucide-loader-2' : 'i-lucide-check'"
              :class="['h-4 w-4', state.loading && 'animate-spin']"
            />
            Valider
          </button>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
