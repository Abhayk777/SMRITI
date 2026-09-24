import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logomark.png'],
      manifest: {
        name: 'Smriti',
        short_name: 'Smriti',
        description:
          "Be close to your parent's day - routines, medicine and mood, from wherever you are.",
        theme_color: '#BC5A3C',
        background_color: '#F5EAD8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logomark.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logomark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Never cache Supabase responses - patient data must not be served stale
        // from a service worker, and a cached response for the wrong session is
        // a cross-patient leak (frontend.md §12).
        navigateFallbackDenylist: [/^\/auth/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // The reviewed static catalogues are deliberately bundled for offline
        // use, but do not need to inflate an unrelated route chunk.
        manualChunks(id) {
          if (id.includes('/src/i18n/locales/')) return 'locale-catalogues'
        },
      },
    },
  },
})
