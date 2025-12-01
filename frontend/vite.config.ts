import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite-config met simpele, robuuste proxy naar je backend op 8081
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
        // optioneel: debug in terminal
        // configure: (proxy, _options) => {
        //   proxy.on('error', (err, _req, _res) => {
        //     console.error('[Vite proxy] error:', err);
        //   });
        // }
      },
    },
  },
  preview: {
    port: 4173,
  },
});

