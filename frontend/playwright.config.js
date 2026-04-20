const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // ─── Test discovery ─────────────────────────────────────────────────────────
  testMatch: ['e2e-tests/full_test.spec.js'],

  // Sequential execution so each test is watchable in the browser
  fullyParallel: false,
  workers: 1,

  // No retries in dev (add retries: 2 for CI)
  retries: 0,

  // 10 min – single continuous demo test
  timeout: 600000,

  // ─── Reporters ──────────────────────────────────────────────────────────────
  reporter: [
    ['list'],                                             // live numbered output
    ['html', { outputFolder: 'playwright-report', open: 'never' }], // full report
  ],

  // ─── Browser / viewport defaults ────────────────────────────────────────────
  use: {
    baseURL: 'http://localhost:3000',

    headless: false,            // VISIBLE browser – watch every action
    slowMo: 700,                // 700ms between Playwright actions
    viewport: { width: 1400, height: 900 },

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // ─── Browser project ────────────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // ─── Dev server ─────────────────────────────────────────────────────────────
  // Playwright will start the React dev server automatically if it isn't
  // already running, and reuse it if it is.
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000, // 2 min for CRA cold start
  },
});
