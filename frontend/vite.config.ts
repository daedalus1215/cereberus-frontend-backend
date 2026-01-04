import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { env } from './vite.env.config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      includeAssets: ['cerberus.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Cereberus App',
        short_name: 'Cereberus',
        description: 'Cereberus password management application',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ],
        id: '/',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait'
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/(?!api\/).*$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: env.VITE_HOST,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
    port: parseInt(env.VITE_PORT),
    proxy: {
      '/api': {
        target: env.VITE_API_URL,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
      },
    },
    outDir: 'dist'
  },
  preview: {
    allowedHosts: [env.VITE_ALLOWED_HOSTS],
    host: env.VITE_HOST,
    port: parseInt(env.VITE_PORT),
    proxy: {
      '/api': {
        target: env.VITE_API_URL,
        changeOrigin: true
      }
    }
  }
})
