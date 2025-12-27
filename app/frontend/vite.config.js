import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "localhost",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log(
              `[VITE PROXY] → ${req.method} ${req.url} → http://127.0.0.1:8080`
            );
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log(
              `[VITE PROXY] ← antwoord ${proxyRes.statusCode} op ${req.method} ${req.url}`
            );
          });
          proxy.on("error", (err, req) => {
            console.error(
              `[VITE PROXY ERROR] bij ${req.method} ${req.url}:`,
              err?.message || err
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

