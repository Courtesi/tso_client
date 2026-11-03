import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
	tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Large, rarely-changing libraries get their own chunks so app deploys
        // don't invalidate them in visitors' caches
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('posthog')) return 'posthog';
          if (id.includes('lightweight-charts')) return 'charts';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
        },
      },
    },
  },
})
