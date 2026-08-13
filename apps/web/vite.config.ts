import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import path from "path"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // recharts (plus its d3 dependency tree) is by far the heaviest
          // library and is only reached from lazily-loaded pages. Nothing else
          // is split manually: hand-splitting shared vendors (e.g. react) can
          // create circular chunk initialisation and a runtime TDZ error.
          if (/node_modules\/(recharts|d3-|victory-|internmap|delaunator)/.test(id)) {
            return "charts"
          }
        },
      },
    },
  },
})
