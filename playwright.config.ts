import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: ['**/__tests__/**', '**/*.test.ts', '**/main/**', '**/frontend/**'],
  // Maximum time one test can run for
  timeout: 60 * 1000,
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 10000
  },
  // Run tests in files in parallel
  fullyParallel: false,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI
  workers: 1,
  // Reporter to use
  reporter: 'list',
  
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:4521',
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    // Take screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  // The Electron app loads the frontend from localhost:4521
  webServer: {
    command: 'pnpm run --filter frontend dev',
    port: 4521,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});