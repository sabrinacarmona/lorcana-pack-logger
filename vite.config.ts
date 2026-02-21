import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/lorcana-pack-logger/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
