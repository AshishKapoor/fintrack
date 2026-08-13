import { defineConfig } from 'orval'

export default defineConfig({
  fintrack: {
    input: '../../apps/web/schema/pft.yaml',
    output: {
      target: './src/gen/fintrack.ts',
      schemas: './src/gen/model',
      client: 'fetch',
      mode: 'single',
      mock: false,
      override: {
        mutator: {
          path: './src/mutator.ts',
          name: 'fintrackFetch',
        },
      },
    },
  },
})
