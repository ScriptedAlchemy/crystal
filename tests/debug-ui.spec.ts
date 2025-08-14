import { test } from '@playwright/test';

test.describe('Debug UI', () => {
  test('Take screenshot of app to debug UI elements', async ({ page }) => {
    console.log('Starting debug test...');
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', err => {
      console.log('Page error:', err.message);
    });
    
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded');
    
    // Wait a bit for everything to render
    await page.waitForTimeout(5000);
    console.log('Waited 5 seconds');
    
    // Take a full page screenshot
    await page.screenshot({ 
      path: 'test-results/debug-ui-screenshot.png', 
      fullPage: true 
    });
    console.log('Screenshot taken');
    
    // Log the HTML content of the root element
    const html = await page.innerHTML('#root').catch(() => 'No #root element found');
    console.log('Root HTML length:', html.length);
    console.log('Root HTML preview:', html.slice(0, 500));
    
    // Check what elements are actually present
    const sidebar = await page.locator('[data-testid="sidebar"]').count();
    const settingsButton = await page.locator('[data-testid="settings-button"]').count();
    const anyButton = await page.locator('button').count();
    const anyDiv = await page.locator('div').count();
    
    console.log('Elements found:', {
      sidebar,
      settingsButton,
      anyButton,
      anyDiv
    });
    
    // Check if body is visible
    const bodyVisible = await page.locator('body').isVisible();
    const rootVisible = await page.locator('#root').isVisible();
    
    console.log('Visibility:', { bodyVisible, rootVisible });
  });
});