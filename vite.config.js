import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png', 'icon-maskable-512x512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Workout Tracker',
        short_name: 'Workout',
        description: 'Track your gym splits and exercises',
        theme_color: '#121110',
        background_color: '#121110',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            // Full-bleed background with the barbell inside the 80% safe zone,
            // so Android's circle / squircle masks don't crop it.
            src: 'icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,woff2}'],
        globIgnores: ['exercise-images/**'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/auth\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/exercise-images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: {
                maxEntries: 302,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/(?!auth)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webformats',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
