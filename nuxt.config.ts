export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  ssr: false,
  runtimeConfig: {
    openRouterApiKey: '',
  },
  typescript: {
    strict: true,
  },
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
})
