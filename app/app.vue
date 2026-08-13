<script setup lang="ts">
// Hidden once a house is validated: the thank-you screen is a deliberate dead end.
const { state } = useArchitect()

useHead({
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', sizes: '32x32', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  meta: [{ name: 'theme-color', content: '#8b5cf6' }],
})
</script>

<template>
  <UApp>
    <MeshBackground />
    <AppHeader v-if="!state.validated" />
    <NuxtPage />
  </UApp>
</template>
