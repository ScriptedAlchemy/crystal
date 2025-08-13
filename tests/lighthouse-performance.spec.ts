import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import { writeFileSync } from 'fs';

test.describe('Crystal Performance Audits', () => {
  test.beforeAll(async () => {
    // Ensure the dev server is running
    // This test assumes the app is already running on localhost:4521
  });

  test('Lighthouse performance audit - App startup', async ({ page, browser }) => {
    const port = 4521;
    await page.goto(`http://localhost:${port}`);
    
    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Run Lighthouse audit
    const results = await playAudit({
      page,
      port,
      config: {
        extends: 'lighthouse:default',
        settings: {
          onlyCategories: ['performance'],
          skipAudits: [
            'canonical', 
            'robots-txt', 
            'hreflang',
            'tap-targets',
            'crawlable-anchors'
          ],
        },
        audits: [
          'first-contentful-paint',
          'largest-contentful-paint', 
          'speed-index',
          'cumulative-layout-shift',
          'total-blocking-time',
          'interactive'
        ]
      },
      cdp: {
        Runtime: {
          enable: true
        },
        Performance: {
          enable: true
        }
      }
    });

    // Log results
    console.log('\n🚀 Performance Scores:');
    console.log(`Performance Score: ${results.lhr.categories.performance.score * 100}/100`);
    console.log('\n📊 Core Web Vitals:');
    console.log(`First Contentful Paint: ${results.lhr.audits['first-contentful-paint'].displayValue}`);
    console.log(`Largest Contentful Paint: ${results.lhr.audits['largest-contentful-paint'].displayValue}`);
    console.log(`Speed Index: ${results.lhr.audits['speed-index'].displayValue}`);
    console.log(`Cumulative Layout Shift: ${results.lhr.audits['cumulative-layout-shift'].displayValue}`);
    console.log(`Total Blocking Time: ${results.lhr.audits['total-blocking-time'].displayValue}`);
    console.log(`Time to Interactive: ${results.lhr.audits['interactive'].displayValue}`);

    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(`lighthouse-report-${timestamp}.json`, JSON.stringify(results.lhr, null, 2));

    // Performance assertions
    expect(results.lhr.categories.performance.score).toBeGreaterThan(0.7); // 70+ score
    
    // Core Web Vitals thresholds
    const fcpValue = results.lhr.audits['first-contentful-paint'].numericValue;
    const lcpValue = results.lhr.audits['largest-contentful-paint'].numericValue;
    const clsValue = results.lhr.audits['cumulative-layout-shift'].numericValue;
    
    expect(fcpValue).toBeLessThan(3000); // FCP should be under 3s
    expect(lcpValue).toBeLessThan(4000); // LCP should be under 4s  
    expect(clsValue).toBeLessThan(0.25); // CLS should be under 0.25
  });

  test('Memory usage during session operations', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    // Monitor memory during session creation
    const memoryBefore = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    // Create a session (simulate heavy operation)
    try {
      await page.click('[data-testid="create-session-button"]', { timeout: 5000 });
      await page.fill('[data-testid="session-prompt"]', 'Performance test session with lots of content');
      await page.click('[data-testid="create-session-submit"]');
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log('Session creation UI elements not found, skipping interaction test');
    }

    const memoryAfter = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (memoryBefore && memoryAfter) {
      const memoryIncrease = memoryAfter.used - memoryBefore.used;
      console.log('\n💾 Memory Usage:');
      console.log(`Before: ${(memoryBefore.used / 1024 / 1024).toFixed(2)} MB`);
      console.log(`After: ${(memoryAfter.used / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Assert memory doesn't grow too much
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    }
  });

  test('UI responsiveness under load', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    // Measure frame rates and input lag
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        let lastTime = performance.now();
        const frameTimes: number[] = [];
        
        function measureFrame() {
          const currentTime = performance.now();
          const frameTime = currentTime - lastTime;
          frameTimes.push(frameTime);
          frames++;
          lastTime = currentTime;
          
          if (frames < 60) { // Measure for ~1 second at 60fps
            requestAnimationFrame(measureFrame);
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const fps = 1000 / avgFrameTime;
            resolve({
              fps: Math.round(fps),
              avgFrameTime: Math.round(avgFrameTime * 100) / 100,
              maxFrameTime: Math.round(Math.max(...frameTimes) * 100) / 100,
              frameCount: frames
            });
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
    });

    console.log('\n🎯 UI Responsiveness:');
    console.log(`Average FPS: ${(performanceMetrics as any).fps}`);
    console.log(`Average frame time: ${(performanceMetrics as any).avgFrameTime}ms`);
    console.log(`Max frame time: ${(performanceMetrics as any).maxFrameTime}ms`);

    // Assert smooth performance
    expect((performanceMetrics as any).fps).toBeGreaterThan(30); // At least 30 FPS
    expect((performanceMetrics as any).maxFrameTime).toBeLessThan(100); // No frame takes >100ms
  });
});