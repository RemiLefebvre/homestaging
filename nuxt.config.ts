export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  ssr: false,
  runtimeConfig: {
    openRouterApiKey: '',
  },
  typescript: {
    strict: true,
  },
  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Cabinet Grotesk', provider: 'fontshare', weights: [500, 700, 800] },
    ],
  },
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
})
