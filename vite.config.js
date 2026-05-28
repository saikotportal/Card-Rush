import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: [],
        parserOpts: {
          plugins: ['jsx']
        }
      }
    })
  ],
  build: {
    outDir: 'dist',
    target: 'es2015'
  }
})
