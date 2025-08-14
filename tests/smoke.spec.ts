import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('Application should start successfully', async ({ page }) => {
    // Navigate to the app
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for any content to appear
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check that the page has loaded
    const title = await page.title();
    expect(title).toBe('Crystal');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/smoke-test.png' });
  });

  test('Main UI elements should be visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the main app container to be ready first
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Wait for React to render the main components
    await page.waitForSelector('[data-testid="sidebar"]', { state: 'attached', timeout: 25000 });
    
    // Close welcome dialog if present
    const getStartedButton = page.locator('button:has-text("Get Started")');
    if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStartedButton.click();
      await page.waitForTimeout(500); // Wait for dialog to close
    }
    
    // Check for main UI elements
    // Sidebar should be visible
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    
    // Settings button should exist (even if not immediately visible)
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toHaveCount(1);
  });

  test('Settings dialog can be opened', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for React to hydrate and main app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForSelector('[data-testid="sidebar"]', { state: 'attached', timeout: 25000 });
    
    // Close welcome dialog if present
    const getStartedButton = page.locator('button:has-text("Get Started")');
    if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStartedButton.click();
    }
    
    // Click settings button
    const settingsButton = page.locator('[data-testid="settings-button"]');
    await expect(settingsButton).toBeVisible({ timeout: 20000 });
    await settingsButton.click();
    
    // Wait for settings to appear - use a simple text selector
    await expect(page.locator('text="Crystal Settings"').first()).toBeVisible({ timeout: 15000 });
    
    // Check that some settings content is visible
    await expect(page.locator('text=/Verbose|API Key|System Prompt/i').first()).toBeVisible({ timeout: 5000 });
  });
});