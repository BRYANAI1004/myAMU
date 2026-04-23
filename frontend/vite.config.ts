import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const srcDir = path.dirname(fileURLToPath(import.meta.url))

const myAmuBuildId =
  process.env.CF_PAGES_COMMIT_SHA?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  `local@${new Date().toISOString()}`

// https://vite.dev/config/
export default defineConfig({
  define: {
    __MYAMU_BUILD_ID__: JSON.stringify(myAmuBuildId),
  },
  resolve: {
    alias: {
      '@': path.join(srcDir, 'src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      includeManifestIcons: false,
      filename: 'sw.js',
      workbox: {
        /* Required for autoUpdate client: new SW must activate instead of staying "waiting". */
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: 'index.html',
        /*
         * SPA shell fallback must not mask API or realtime transports.
         * API calls use `${VITE_API_BASE_URL}/api/...` (often another origin); same-origin
         * `/api/*` and `/socket.io/*` are still excluded from the navigation fallback.
         */
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        cleanupOutdatedCaches: true,
        /* Keep precache for the shell; add conservative runtime caches only for static media/fonts */
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'amu-static-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'amu-google-font-files',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
