import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// *** DEFINITIEVE, STABIELE LESSIE VITE CONFIG ***
// - Frontend mag op elke poort draaien (5173, 5174, etc.)
// - ALLE /api-calls gaan ALTIJD naar http://127.0.0.1:8081
// - Proxy breekt nooit meer
// - Heldere logging bij fouten

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: 'localhost',

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        secure: false,

        configure: (proxy) => {
          // Debug: alles loggen
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(
              `[VITE PROXY] → ${req.method} ${req.url} → http://127.0.0.1:8081`
            );
          });

          proxy.on('error', (err, req) => {
            console.error(
              `[VITE PROXY ERROR] bij ${req.method} ${req.url}:`,
              err.message
            );
          });

          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(
              `[VITE PROXY] ← antwoord ${proxyRes.statusCode} op ${req.method} ${req.url}`
            );
          });
        },
      },
    },
  },

  preview: {
    port: 4173,
  },
});

