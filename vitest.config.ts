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
    // The fixture-matrix audit (PositionTableV2.coverage.test.tsx) parses all
    // 10 example LV workbooks and re-renders large tables dozens of times in a
    // single worker, which pushes happy-dom past Node's default ~4 GB old-space
    // ceiling on machines that have the Desktop fixtures (CI skips the matrix).
    // The heap bump is supplied via NODE_OPTIONS in the npm test script — forks
    // inherit it through the environment. (poolOptions.forks.execArgv is NOT a
    // reliable channel here: vitest v4 manages the fork execArgv itself and
    // drops custom entries, so --max-old-space-size set there is ignored.)
    pool: 'forks',
    // A memory-heavy worker can be slow to finalize/exit; give vitest's teardown
    // longer than the 10 s default so it doesn't kill the worker prematurely.
    teardownTimeout: 30000,
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.test.mjs',
    ],
    setupFiles: ['./src/test/setup.ts'],
  },
});
