import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Longer timeout for performance tests
  timeout: 120 * 1000,
  expect: {
    timeout: 15000
  },
  // Don't run performance tests in parallel to get accurate measurements
  fullyParallel: false,
  workers: 1,
  // Retry failed tests
  retries: 1,
  // Enhanced reporter for performance data
  reporter: [
    ['list'],
    ['json', { outputFile: 'performance-results.json' }],
    ['html', { outputFolder: 'performance-report', open: 'never' }]
  ],
  
  use: {
    baseURL: 'http://localhost:4521',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Fix recordVideo configuration
    recordVideo: {
      dir: './test-results/videos/',
      size: { width: 1280, height: 720 }
    },
    // Performance testing specific options
    launchOptions: {
      // Enable performance monitoring
      args: [
        '--enable-precise-memory-info',
        '--enable-performance-logging',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
    },
  },

  projects: [
    {
      name: 'performance-chromium',
      use: { 
        ...devices['Desktop Chrome']
      },
      testMatch: [
        '**/performance.spec.ts',
        '**/lighthouse-performance.spec.ts', 
        '**/devtools-profiling.spec.ts',
        '**/crystal-ui-performance.spec.ts',
        '**/react-electron-performance.spec.ts'
      ]
    },
  ],

  // Start dev server before performance tests
  webServer: {
    command: 'pnpm electron-dev',
    port: 4521,
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'development',
      // Enable performance monitoring in the app
      CRYSTAL_PERF_MODE: '1'
    },
  },
});