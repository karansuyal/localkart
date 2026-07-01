import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'LocalKart – 12 Min Delivery',
        short_name: 'LocalKart',
        description: 'Hyperlocal grocery delivery from shops near you',
        theme_color: '#1A1A2E',
        background_color: '#1A1A2E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache sirf PUBLIC, non-user-specific GET endpoints jo user-agnostic
        // hain (shops list, product details) -- taaki cold Render start pe
        // bhi app turant kuch dikha sake.
        //
        // orders/my, users/me, payments/* jaise auth-required endpoints ko
        // YAHAN CACHE NAHI KARTE -- pehle yahan sirf "pathname.startsWith('/api/')"
        // check hota tha, jo backend ke saare routes (auth wale bhi) match
        // kar leta tha. Isse ye hota tha: agar Render backend cold-start ke
        // dauraan network request slow/fail hoti, toh NetworkFirst ke paas
        // koi cached fallback na hone se "no-response" error throw hoti thi,
        // aur My Orders page blank/white reh jaata tha.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://localkart-gj6g.onrender.com' &&
              /^\/api\/v1\/(shops|products)(\/|$)/.test(url.pathname),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 8, // jaldi cache/fail pe switch, hang na ho
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Auth-required, per-user endpoints -- kabhi cache nahi, hamesha
          // seedha network se jao. Explicit NetworkOnly rakhne se koi bhi
          // future broad rule galti se inhe cache nahi karega.
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://localkart-gj6g.onrender.com' &&
              /^\/api\/v1\/(orders|users|payments|reviews|delivery)(\/|$)/.test(url.pathname),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})