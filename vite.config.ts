import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/pages': path.resolve(__dirname, './src/renderer/pages'),
      '@/hooks': path.resolve(__dirname, './src/renderer/hooks'),
      '@/utils': path.resolve(__dirname, './src/renderer/utils'),
      '@/styles': path.resolve(__dirname, './src/renderer/styles'),
      '@/main': path.resolve(__dirname, './src/main'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
}) 