import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192x192.png', 'icons/icon-512x512.png'],
      manifest: {
        name: 'Bloom & Co. Botanical Florist',
        short_name: 'Bloom & Co.',
        description:
          'Aplikasi pemesanan buket bunga segar Bloom & Co. dengan kartu ucapan personal dan pengambilan di toko.',
        theme_color: '#1E3528',
        background_color: '#FAF8F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Pastikan hanya GET /api/products dan GET /api/categories yang memakai NetworkFirst.
        // Endpoint /api/orders, /api/config, dan /api/admin/* selalu NetworkOnly (tidak di-cache).
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname === '/api/products' ||
                url.pathname.startsWith('/api/products/') ||
                url.pathname === '/api/categories' ||
                url.pathname.startsWith('/api/categories/')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bloom-catalog-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 3, // 3 hari
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/orders') ||
              url.pathname.startsWith('/api/config') ||
              url.pathname.startsWith('/api/admin') ||
              url.pathname.startsWith('/api/customers'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bloom-images-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 hari
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
