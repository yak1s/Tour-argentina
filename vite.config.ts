import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * base: './' makes every asset URL relative, so the same build works at
 * https://<user>.github.io/<repo>/ (GitHub Pages), at the root of a local
 * server, and from the offline cache. Routing uses the URL hash.
 */
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: './',
        name: 'Buenos Aires: The Hidden City',
        short_name: 'Hidden City',
        description: 'An offline treasure-hunt tour of Buenos Aires for two.',
        lang: 'en',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1121',
        theme_color: '#0b1121',
        categories: ['travel', 'games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Route & map', short_name: 'Route', url: './#/route', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Journal', short_name: 'Journal', url: './#/journal', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp3,webmanifest}'],
        // Narration files are up to ~1 MB each; the whole pack is precached.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 400,
  },
});
