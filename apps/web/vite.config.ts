import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { defineConfig } from "vite"

// https://vite.dev/config/
//
// No manualChunks. recharts is only reached from lazily loaded pages, so
// Rollup's automatic splitting already keeps it out of the entry. A manual
// "charts" chunk did the opposite: Rollup pulls a manual chunk's dependencies
// in with it, so React, its JSX runtime and clsx landed there, and every page
// (login included) had to preload all of recharts to boot.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
})
