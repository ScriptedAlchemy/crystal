import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';

test.describe('Crystal Message & Session Performance', () => {
  
  /**
   * Test message rendering performance with continuous message streaming
   * This test captures the freezing issue when new messages arrive
   */
  test('measure message streaming performance and UI responsiveness', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    // Add performance monitoring
    await page.addInitScript(() => {
      (window as any).performanceData = {
        freezes: [],
        longTasks: [],
        renderTimes: [],
        messageUpdates: []
      };
      
      // Monitor long tasks (UI freezes)
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms cause noticeable lag
            (window as any).performanceData.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
      
      // Monitor animation frames to detect freezes
      let lastFrameTime = performance.now();
      let frameCount = 0;
      const checkFrameRate = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        
        if (deltaTime > 100) { // Freeze if frame takes > 100ms
          (window as any).performanceData.freezes.push({
            duration: deltaTime,
            timestamp: currentTime,
            frameNumber: frameCount
          });
        }
        
        lastFrameTime = currentTime;
        frameCount++;
        requestAnimationFrame(checkFrameRate);
      };
      requestAnimationFrame(checkFrameRate);
    });
    
    // Navigate to a session with active messaging
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    if (sessions.length > 0) {
      console.log(`Found ${sessions.length} sessions`);
      
      // Click on first session
      await sessions[0].click();
      await page.waitForTimeout(1000);
      
      // Send a message to trigger message rendering
      const inputArea = page.locator('textarea, [data-testid="message-input"], .input-area, [contenteditable="true"]').first();
      if (await inputArea.isVisible()) {
        console.log('📝 Sending test message to measure rendering performance...');
        
        // Start performance measurement
        const startTime = Date.now();
        
        await inputArea.fill('Test message for performance analysis');
        await page.keyboard.press('Enter');
        
        // Wait for response to start appearing
        await page.waitForTimeout(3000);
        
        // Collect performance data
        const performanceData = await page.evaluate(() => {
          return (window as any).performanceData;
        });
        
        const responseTime = Date.now() - startTime;
        
        // Analyze results
        console.log('\n🔥 Performance Analysis:');
        console.log(`Response time: ${responseTime}ms`);
        console.log(`UI Freezes detected: ${performanceData.freezes.length}`);
        console.log(`Long tasks (>50ms): ${performanceData.longTasks.length}`);
        
        if (performanceData.freezes.length > 0) {
          console.log('\n⚠️ UI Freeze Details:');
          performanceData.freezes.forEach((freeze: any, index: number) => {
            console.log(`  Freeze #${index + 1}: ${freeze.duration.toFixed(2)}ms at frame ${freeze.frameNumber}`);
          });
        }
        
        if (performanceData.longTasks.length > 0) {
          console.log('\n🐌 Long Running Tasks:');
          performanceData.longTasks.forEach((task: any, index: number) => {
            console.log(`  Task #${index + 1}: ${task.duration.toFixed(2)}ms - ${task.name}`);
          });
        }
        
        // Assertions
        expect(performanceData.freezes.length).toBeLessThan(3); // Maximum 3 freezes allowed
        expect(performanceData.longTasks.length).toBeLessThan(10); // Maximum 10 long tasks
        
        // Save detailed report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        writeFileSync(
          `message-performance-${timestamp}.json`, 
          JSON.stringify(performanceData, null, 2)
        );
      }
    }
  });

  /**
   * Test session switching performance
   * This captures the hanging issue when switching between sessions
   */
  test('measure session switching performance and blocking', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    // Setup performance monitoring
    await page.addInitScript(() => {
      (window as any).switchMetrics = {
        switches: [],
        blockingTime: 0
      };
      
      // Track main thread blocking
      let lastInteractionTime = 0;
      document.addEventListener('click', () => {
        lastInteractionTime = performance.now();
      });
      
      // Monitor when UI becomes responsive again
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (lastInteractionTime > 0) {
            const blockTime = entry.startTime - lastInteractionTime;
            if (blockTime > 50) {
              (window as any).switchMetrics.blockingTime += blockTime;
            }
          }
        });
      });
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    });
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length >= 2) {
      console.log(`\n🔄 Testing session switching between ${sessions.length} sessions...`);
      
      // Perform multiple session switches
      for (let i = 0; i < Math.min(5, sessions.length); i++) {
        const startSwitch = Date.now();
        
        await sessions[i].click();
        
        // Wait for content to load
        await page.waitForSelector('.xterm-screen, [data-testid="output-container"], .output-view', {
          state: 'visible',
          timeout: 5000
        }).catch(() => null);
        
        const switchTime = Date.now() - startSwitch;
        
        // Log the switch metrics
        await page.evaluate((metrics) => {
          (window as any).switchMetrics.switches.push(metrics);
        }, { index: i, time: switchTime });
        
        console.log(`  Switch #${i + 1}: ${switchTime}ms`);
        
        // Assert reasonable switching time
        expect(switchTime).toBeLessThan(2000); // Should switch in under 2 seconds
        
        await page.waitForTimeout(500); // Small delay between switches
      }
      
      // Get accumulated metrics
      const metrics = await page.evaluate(() => (window as any).switchMetrics);
      
      console.log(`\n📊 Session Switching Summary:`);
      console.log(`Total blocking time: ${metrics.blockingTime.toFixed(2)}ms`);
      console.log(`Average switch time: ${(metrics.switches.reduce((a: any, b: any) => a + b.time, 0) / metrics.switches.length).toFixed(2)}ms`);
      
      // Save metrics
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(
        `session-switch-performance-${timestamp}.json`,
        JSON.stringify(metrics, null, 2)
      );
    }
  });

  /**
   * Test terminal output rendering with large amounts of data
   * This tests XTerm.js performance with the 100k line scrollback
   */
  test('measure terminal rendering with heavy output', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    // Monitor terminal rendering performance
    await page.addInitScript(() => {
      (window as any).terminalMetrics = {
        scrollEvents: [],
        renderFrames: [],
        memoryGrowth: []
      };
      
      // Track memory growth
      const checkMemory = () => {
        if ((performance as any).memory) {
          (window as any).terminalMetrics.memoryGrowth.push({
            timestamp: Date.now(),
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          });
        }
      };
      
      // Check memory every second
      setInterval(checkMemory, 1000);
      checkMemory();
    });
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length > 0) {
      await sessions[0].click();
      await page.waitForTimeout(1000);
      
      // Find terminal element
      const terminal = page.locator('.xterm, .terminal, [class*="terminal"]').first();
      
      if (await terminal.isVisible()) {
        console.log('\n📜 Testing terminal scroll performance...');
        
        // Perform rapid scrolling to test rendering
        const startScroll = Date.now();
        
        // Scroll down multiple times
        for (let i = 0; i < 10; i++) {
          await terminal.evaluate((el) => {
            el.scrollTop = el.scrollHeight * (i / 10);
          });
          await page.waitForTimeout(100);
        }
        
        const scrollTime = Date.now() - startScroll;
        console.log(`Scroll test completed in ${scrollTime}ms`);
        
        // Get terminal metrics
        const metrics = await page.evaluate(() => (window as any).terminalMetrics);
        
        if (metrics.memoryGrowth.length > 1) {
          const memoryIncrease = metrics.memoryGrowth[metrics.memoryGrowth.length - 1].used - metrics.memoryGrowth[0].used;
          console.log(`Memory growth during scrolling: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
          
          // Memory growth should be reasonable
          expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
        }
      }
    }
  });

  /**
   * Profile React component re-renders during message updates
   */
  test('profile React re-renders during updates', async ({ page }) => {
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    // Inject React profiling
    await page.addInitScript(() => {
      (window as any).reactRenders = {
        components: {},
        totalRenders: 0,
        slowRenders: []
      };
      
      // Hook into React DevTools if available
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        const original = hook.onCommitFiberRoot;
        
        hook.onCommitFiberRoot = function(id: any, root: any, priorityLevel: any) {
          (window as any).reactRenders.totalRenders++;
          
          // Track render time
          const renderTime = performance.now();
          
          // Check for slow renders (> 16ms is one frame)
          if (renderTime > 16) {
            (window as any).reactRenders.slowRenders.push({
              time: renderTime,
              timestamp: Date.now()
            });
          }
          
          if (original) {
            original.call(this, id, root, priorityLevel);
          }
        };
      }
    });
    
    // Navigate to a session
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length > 0) {
      await sessions[0].click();
      await page.waitForTimeout(2000);
      
      // Get React metrics
      const reactMetrics = await page.evaluate(() => (window as any).reactRenders);
      
      console.log('\n⚛️ React Performance:');
      console.log(`Total renders: ${reactMetrics.totalRenders}`);
      console.log(`Slow renders (>16ms): ${reactMetrics.slowRenders.length}`);
      
      if (reactMetrics.slowRenders.length > 0) {
        console.log('\n🐌 Slow React Renders:');
        reactMetrics.slowRenders.slice(0, 5).forEach((render: any, i: number) => {
          console.log(`  Render #${i + 1}: ${render.time.toFixed(2)}ms`);
        });
      }
      
      // Excessive re-renders can cause UI freezes
      expect(reactMetrics.totalRenders).toBeLessThan(100); // Reasonable number of renders
      expect(reactMetrics.slowRenders.length).toBeLessThan(10); // Few slow renders
    }
  });
});