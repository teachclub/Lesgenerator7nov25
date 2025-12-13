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
                configure: function (proxy) {
                    // Debug: alles loggen
                    proxy.on('proxyReq', function (proxyReq, req) {
                        console.log("[VITE PROXY] \u2192 ".concat(req.method, " ").concat(req.url, " \u2192 http://127.0.0.1:8081"));
                    });
                    proxy.on('error', function (err, req) {
                        console.error("[VITE PROXY ERROR] bij ".concat(req.method, " ").concat(req.url, ":"), err.message);
                    });
                    proxy.on('proxyRes', function (proxyRes, req) {
                        console.log("[VITE PROXY] \u2190 antwoord ".concat(proxyRes.statusCode, " op ").concat(req.method, " ").concat(req.url));
                    });
                },
            },
        },
    },
    preview: {
        port: 4173,
    },
});
