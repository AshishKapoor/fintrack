import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so the production build does not carry the
// test-only plugins and aliases.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test/setup.ts'],
    include: ['app/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['app/lib/**', 'app/context/**', 'app/components/ui/currency-display.tsx'],
    },
  },
})
