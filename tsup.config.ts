import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['./src/extension.ts', './src/notebook/objectRenderer.tsx'],
    external: ['vscode'],
    format: ['cjs', 'esm'],
    splitting: false,
    esbuildOptions(options) {
      options.define = {
        'process.env.NODE_ENV': JSON.stringify('production'),
      }
    },
  },
])
