/**
 * Playwright config for the Round 3 e2e suite.
 *
 * Boots both servers via `webServer`:
 *   - panel-api on :3000 with a fresh DB at panel-api/data/e2e.db
 *     (deleted before each run; seed user gets a known password)
 *   - vite frontend on :5174 (proxies /api → :3000 per vite.config.ts)
 *
 * Single chromium project. Headless. 60s timeout per test (file upload +
 * two-context flow can be slow).
 */

import { defineConfig, devices } from '@playwright/test';

const SEED_EMAIL = 'e2e@kalku.test';
const SEED_PASSWORD = 'e2e-secret-12345';
const SEED_DB = 'panel-api/data/e2e.db';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false, // shared DB; serial is safer
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'docs/v2_redesign/e2e/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    actionTimeout: 15_000,
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      name: 'panel-api',
      // Wipe the e2e DB so each run starts clean. The dev server's own
      // bootstrap calls runMigrations() at startup, so we start the server
      // FIRST (which creates the schema), wait for it to be ready, then
      // seed via a one-shot script. Implemented as a chained shell command.
      command: `rm -f ${SEED_DB} && SEED_EMAIL=${SEED_EMAIL} SEED_PASSWORD=${SEED_PASSWORD} SEED_NAME='E2E Tester' SEED_COMPANY='E2E Co' DB_PATH=${SEED_DB} npm run seed --prefix panel-api && DB_PATH=${SEED_DB} npm run dev --prefix panel-api`,
      port: 3000,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      port: 5174,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});

// Export so tests can read them.
export const E2E = {
  SEED_EMAIL,
  SEED_PASSWORD,
};
