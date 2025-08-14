import { test, expect, chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

test.describe('Crystal DevTools Performance Profiling', () => {
  test('Profile CPU usage during heavy operations', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable performance profiling
    const client = await context.newCDPSession(page);
    await client.send('Profiler.enable');
    await client.send('Runtime.enable');

    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    // Start CPU profiling
    await client.send('Profiler.start');
    const startTime = Date.now();

    // Perform operations that might be slow
    try {
      // Navigate through different views
      await page.click('[data-testid="settings-button"]', { timeout: 2000 });
      await page.waitForTimeout(500);
      await page.press('body', 'Escape'); // Close settings
      
      // Switch between tabs/views
      await page.click('[data-testid="output-tab"]', { timeout: 2000 });
      await page.waitForTimeout(500);
      await page.click('[data-testid="messages-tab"]', { timeout: 2000 });
      await page.waitForTimeout(500);
      
      // Simulate terminal scrolling/interaction
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(500);
      await page.mouse.wheel(0, -1000);
      
    } catch (error) {
      console.log('Some UI elements not found, continuing with available interactions');
    }

    // Stop profiling and get results
    const { profile } = await client.send('Profiler.stop');
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Analyze the profile
    const functions = profile.nodes.map(node => ({
      functionName: node.callFrame.functionName || '(anonymous)',
      url: node.callFrame.url,
      hitCount: node.hitCount,
      selfTime: node.hitCount * profile.timeInterval
    }));

    // Sort by time spent
    functions.sort((a, b) => b.selfTime - a.selfTime);

    console.log('\n🔥 CPU Hotspots (Top 10):');
    functions.slice(0, 10).forEach((fn, i) => {
      if (fn.selfTime > 0) {
        console.log(`${i + 1}. ${fn.functionName || '(anonymous)'}: ${fn.selfTime.toFixed(2)}ms`);
        if (fn.url && !fn.url.startsWith('node:')) {
          console.log(`   ${fn.url.substring(fn.url.lastIndexOf('/') + 1)}`);
        }
      }
    });

    // Save detailed profile
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(`cpu-profile-${timestamp}.json`, JSON.stringify(profile, null, 2));

    console.log(`\n📊 Profiling completed in ${duration}ms`);
    console.log(`Profile saved to cpu-profile-${timestamp}.json`);

    await browser.close();
  });

  test('Memory heap profiling', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const client = await context.newCDPSession(page);
    await client.send('HeapProfiler.enable');

    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    // Take initial heap snapshot
    await client.send('HeapProfiler.collectGarbage');
    const initialSnapshot = await client.send('HeapProfiler.takeHeapSnapshot');

    // Perform memory-intensive operations
    for (let i = 0; i < 5; i++) {
      try {
        // Simulate creating and destroying UI elements
        await page.click('[data-testid="create-session-button"]', { timeout: 1000 });
        await page.press('body', 'Escape');
        await page.waitForTimeout(200);
      } catch {
        // Continue if elements don't exist
        await page.evaluate(() => {
          // Create some DOM elements to simulate memory usage
          for (let j = 0; j < 100; j++) {
            const div = document.createElement('div');
            div.innerHTML = `Test element ${j}`;
            document.body.appendChild(div);
            setTimeout(() => document.body.removeChild(div), 100);
          }
        });
      }
    }

    // Take final heap snapshot
    await client.send('HeapProfiler.collectGarbage');
    const finalSnapshot = await client.send('HeapProfiler.takeHeapSnapshot');

    // Get memory stats
    const memoryUsage = await page.evaluate(() => {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (memoryUsage) {
      console.log('\n💾 Memory Statistics:');
      console.log(`Used: ${(memoryUsage.used / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Total: ${(memoryUsage.total / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Limit: ${(memoryUsage.limit / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Usage: ${((memoryUsage.used / memoryUsage.limit) * 100).toFixed(2)}%`);
    }

    await browser.close();
  });

  test('Network performance monitoring', async ({ page }) => {
    const responses: any[] = [];
    const requests: any[] = [];

    // Monitor network requests
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'],
        timestamp: Date.now()
      });
    });

    const startTime = Date.now();
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log('\n🌐 Network Performance:');
    console.log(`Page load time: ${loadTime}ms`);
    console.log(`Total requests: ${requests.length}`);
    console.log(`Total responses: ${responses.length}`);

    // Analyze request types
    const resourceTypes = requests.reduce((acc, req) => {
      acc[req.resourceType] = (acc[req.resourceType] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Resource breakdown:');
    Object.entries(resourceTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

    // Check for slow requests
    const slowResponses = responses.filter(res => {
      const matchingReq = requests.find(req => req.url === res.url);
      return matchingReq && (res.timestamp - matchingReq.timestamp) > 1000;
    });

    if (slowResponses.length > 0) {
      console.log('\n🐌 Slow requests (>1s):');
      slowResponses.forEach(res => {
        console.log(`${res.url}: ${res.status}`);
      });
    }

    // Assert reasonable load times
    expect(loadTime).toBeLessThan(10000); // Under 10 seconds
    expect(requests.length).toBeLessThan(200); // Allow up to 200 requests (Electron apps load many JS modules)
  });
});