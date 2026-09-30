import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const apiTarget = process.env.VITE_DEV_PROXY || "http://localhost:3000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Optional dev proxy: set VITE_API_PROXY=true and call the API as "/api".
    proxy:
      process.env.VITE_API_PROXY === "true"
        ? {
            "/api": {
              target: apiTarget,
              changeOrigin: false,
            },
          }
        : undefined,
  },
  build: {
    // Source maps would expose the full source tree in production.
    sourcemap: false,
    // The vendor bundle is intentionally kept in one chunk for HTTP/2 reuse;
    // this simply keeps the reporter honest about the expected size.
    chunkSizeWarningLimit: 800,
    reportCompressedSize: true,
  },
});

