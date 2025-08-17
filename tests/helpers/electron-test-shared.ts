import { test as base, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication | null = null;
let electronPage: Page | null = null;

// Setup shared Electron instance for all tests in the worker
export const test = base.extend<{
  electronApp: ElectronApplication;
  electronPage: Page;
}>({
  electronApp: [async ({}, use) => {
    // Reuse existing app instance if available
    if (!electronApp) {
      const appPath = path.join(__dirname, '../..');
      
      // Launch Electron app with the correct entry point
      electronApp = await electron.launch({
        args: [appPath],
        env: {
          ...process.env,
          CRYSTAL_DIR: path.join(process.env.HOME!, '.crystal'), // Use production database
          NODE_ENV: 'test',
          DEVTOOLS_MODE: 'hidden',
          ELECTRON_IS_DEV: '1',
          PLAYWRIGHT_TEST: 'true'
        },
        timeout: 60000
      });
      
      // Get the first window
      electronPage = await electronApp.firstWindow();
      
      // Wait for app to fully load
      await electronPage.waitForSelector('#root', { timeout: 30000 });
      await electronPage.waitForSelector('[data-testid="sidebar"]', { timeout: 30000 });
      
      // Close welcome dialog if present
      const getStartedButton = electronPage.locator('button:has-text("Get Started")');
      if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await getStartedButton.click();
        await electronPage.waitForTimeout(500);
      }
    }
    
    await use(electronApp);
    
    // Cleanup will happen when the worker shuts down
    // Don't close here as other tests might still need it
  }, { scope: 'worker', auto: true }], // Shared across all tests in a worker, auto-cleanup
  
  electronPage: [async ({ electronApp }, use) => {
    if (!electronPage) {
      throw new Error('Electron page not initialized');
    }
    
    // Before each test, reset any state if needed
    // For example, navigate back to the main page if necessary
    
    await use(electronPage);
    
    // After each test, you might want to reset some state
    // but don't close the page
  }, { scope: 'worker' }] // Shared across all tests in a worker
});

// Don't close the app after each file - let Playwright handle cleanup
// The app will be closed when the worker shuts down

export { expect } from '@playwright/test';