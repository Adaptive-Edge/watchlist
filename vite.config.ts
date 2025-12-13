import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Watchlist - Update base path to match your app's URL path
export default defineConfig({
  base: "/watchlist/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5031",
        changeOrigin: true,
      },
    },
  },
});
