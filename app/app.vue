<script setup lang="ts">
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
    <AppHeader />
    <NuxtPage />
  </UApp>
</template>
