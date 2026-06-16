export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  ssr: false,
  runtimeConfig: {
    openRouterApiKey: '',
    openRouterTextModel: 'anthropic/claude-sonnet-4',
    // Site-wide password gate. Empty = public mode (no gate). Set via NUXT_SITE_PASSWORD.
    sitePassword: '',
  },
  nitro: {
    // Bundle `public/` into the serverless function so server code can read the
    // brand logo at runtime (on Vercel `public/` is served by the CDN and is NOT
    // on the function filesystem). Read via useStorage('assets:brand').
    // `dir` is resolved relative to the Nitro srcDir (`<root>/server`), so we
    // climb one level to reach the project's real `public/` directory.
    serverAssets: [{ baseName: 'brand', dir: '../public' }],
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
  vite: {
    optimizeDeps: {
      include: ['motion-v', '@vueuse/core'],
    },
  },
})
