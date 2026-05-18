import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4174,
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  build: {
    target: 'es2022',
    // 'hidden' = Sourcemaps werden gebaut, aber NICHT via Comment im JS referenziert
    // -> nicht oeffentlich auslieferbar (kein //# sourceMappingURL), intern fuer Sentry/Debug nutzbar
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('html2canvas') ||
            id.includes('dompurify')
          )
            return 'pdf';
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/')
          )
            return 'react';
          if (id.includes('node_modules/lucide-react')) return 'icons';
        },
      },
    },
  },
});
