import { test, expect } from '@playwright/test';

test.describe('Crystal Performance Tests', () => {
  test('measure page load performance', async ({ page }) => {
    // Start performance measurement
    await page.goto('http://localhost:4521');
    
    // Measure Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = entries.reduce((acc, entry) => {
            if (entry.entryType === 'navigation') {
              acc.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
              acc.loadComplete = entry.loadEventEnd - entry.loadEventStart;
            }
            return acc;
          }, {});
          resolve(vitals);
        }).observe({ entryTypes: ['navigation'] });
      });
    });

    console.log('Web Vitals:', webVitals);
    
    // Measure memory usage
    const memoryInfo = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    console.log('Memory Info:', memoryInfo);
  });

  test('measure session creation performance', async ({ page }) => {
    await page.goto('http://localhost:4521');
    
    // Start timing
    const startTime = Date.now();
    
    // Perform session creation
    await page.click('[data-testid="create-session-button"]');
    await page.fill('[data-testid="session-prompt"]', 'Test performance session');
    
    // Measure time to interactive
    await page.click('[data-testid="create-session-submit"]');
    await page.waitForSelector('[data-testid="session-created"]', { timeout: 30000 });
    
    const endTime = Date.now();
    const sessionCreationTime = endTime - startTime;
    
    console.log(`Session creation time: ${sessionCreationTime}ms`);
    expect(sessionCreationTime).toBeLessThan(5000); // Should be under 5 seconds
  });

  test('measure terminal rendering performance', async ({ page }) => {
    await page.goto('http://localhost:4521');
    
    // Navigate to a session with terminal output
    await page.click('[data-testid="session-item"]:first-child');
    
    // Measure rendering performance
    const renderingMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const paintEntries = list.getEntries().filter(entry => 
            entry.entryType === 'paint'
          );
          resolve(paintEntries);
        });
        observer.observe({ entryTypes: ['paint'] });
        
        // Trigger re-render by switching views
        setTimeout(() => resolve([]), 2000);
      });
    });

    console.log('Rendering metrics:', renderingMetrics);
  });
});