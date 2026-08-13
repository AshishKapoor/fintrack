import { defineConfig } from 'orval'

export default defineConfig({
  pft: {
    input: './schema/pft.yaml',
    output: {
      target: './app/client/gen/pft/index.ts',
      schemas: './app/client/gen/pft',
      client: 'swr',
      mode: 'tags-split',
      mock: false,
      override: {
        mutator: {
          path: './app/client/httpPFTClient.ts',
          name: 'httpPFTClient',
        },
      },
    },
  },
})
