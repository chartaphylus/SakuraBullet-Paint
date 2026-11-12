import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const origName = assetInfo.names?.[0] || assetInfo.name || 'asset';
          const lastDot = origName.lastIndexOf('.');
          const base = lastDot >= 0 ? origName.slice(0, lastDot) : origName;
          const ext = lastDot >= 0 ? origName.slice(lastDot) : '';
          const safeBase =
            base
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'lycoris-asset';
          return `assets/${safeBase}-[hash]${ext}`;
        },
      },
    },
  },
})
