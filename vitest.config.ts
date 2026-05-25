/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // happy-dom — required on Node 22.11. jsdom@28+ trips on ESM-only
    // @exodus/bytes; jsdom@27 trips on ESM-only @csstools/css-calc. Both
    // need Node 22.12+ which we're not on yet. Tests that depended on
    // jsdom-specific quirks have been adjusted to happy-dom-compatible
    // patterns (window.confirm mock in setup, fireEvent semantics).
    environment: 'happy-dom',
    globals: true,
    css: false,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.test.mjs',
    ],
    setupFiles: ['./src/test/setup.ts'],
  },
});
