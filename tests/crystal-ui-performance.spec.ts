import { test, expect, Page } from '@playwright/test';
import { writeFileSync } from 'fs';

/**
 * Crystal UI Performance Tests
 * 
 * Tests the most performance-critical operations:
 * 1. Message rendering with large conversations
 * 2. Project switching with many sessions
 * 3. Session creation and switching
 * 4. Terminal output processing
 * 5. Diff view rendering
 */

test.describe('Crystal UI Performance', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    // Create a context for each test
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Enable performance measurement APIs
    await page.addInitScript(() => {
      // Expose performance metrics
      (window as any).performanceMetrics = {
        renders: [],
        interactions: [],
        memorySnapshots: []
      };
      
      // Track React renders (if React DevTools is available)
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
        hook.onCommitFiberRoot = function(...args: any[]) {
          const renderTime = Date.now();
          (window as any).performanceMetrics.renders.push({
            time: renderTime,
            type: 'react-render'
          });
          if (originalOnCommitFiberRoot) {
            originalOnCommitFiberRoot.apply(this, args);
          }
        };
      }
    });
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
  });

  test('Message rendering performance with many messages', async () => {
    // Navigate to a session with many messages
    const sessions = await page.locator('[data-testid^="session-item"]').all();
    
    if (sessions.length > 0) {
      // Click on the first session
      const startTime = Date.now();
      await sessions[0].click();
      
      // Wait for messages to render
      await page.waitForSelector('[data-testid="message-container"]', { 
        timeout: 10000 
      }).catch(() => {
        // Fallback to checking for any output
        return page.waitForSelector('.xterm-screen', { timeout: 10000 });
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`📊 Session load time: ${loadTime}ms`);
      
      // Measure scroll performance
      const scrollMetrics = await page.evaluate(async () => {
        const container = document.querySelector('[data-testid="output-container"]') || 
                         document.querySelector('.xterm-viewport') ||
                         document.querySelector('[role="main"]');
        
        if (!container) {
          return { error: 'No scrollable container found' };
        }
        
        const measurements: number[] = [];
        const scrollSteps = 10;
        const scrollAmount = (container as HTMLElement).scrollHeight / scrollSteps;
        
        for (let i = 0; i < scrollSteps; i++) {
          const frameStart = performance.now();
          (container as HTMLElement).scrollTop = scrollAmount * i;
          
          // Force layout/paint
          void (container as HTMLElement).offsetHeight;
          
          await new Promise(resolve => requestAnimationFrame(resolve));
          const frameEnd = performance.now();
          measurements.push(frameEnd - frameStart);
        }
        
        return {
          avgScrollTime: measurements.reduce((a, b) => a + b, 0) / measurements.length,
          maxScrollTime: Math.max(...measurements),
          measurements
        };
      });
      
      console.log('📜 Scroll Performance:', scrollMetrics);
      
      if (!scrollMetrics.error) {
        expect(scrollMetrics.avgScrollTime).toBeLessThan(50); // Under 50ms average
        expect(scrollMetrics.maxScrollTime).toBeLessThan(100); // No frame over 100ms
      }
      
      // Test message input performance
      const inputField = await page.locator('[data-testid="session-input"], textarea[placeholder*="Type"], textarea').first();
      
      if (await inputField.isVisible()) {
        const typingMetrics = await page.evaluate(async (selector) => {
          const input = document.querySelector(selector) as HTMLTextAreaElement;
          if (!input) return { error: 'Input not found' };
          
          const startTime = performance.now();
          const testText = 'This is a performance test message with lots of text to measure input lag and rendering performance in the Crystal application. '.repeat(10);
          
          // Simulate typing
          for (let i = 0; i < testText.length; i += 10) {
            input.value = testText.substring(0, i);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          const endTime = performance.now();
          return {
            totalTime: endTime - startTime,
            charactersTyped: testText.length,
            avgTimePerChar: (endTime - startTime) / testText.length
          };
        }, await inputField.elementHandle().then(h => h?.toString() || 'textarea'));
        
        console.log('⌨️ Typing Performance:', typingMetrics);
        
        if (!typingMetrics.error) {
          expect(typingMetrics.avgTimePerChar).toBeLessThan(5); // Under 5ms per character
        }
      }
      
      expect(loadTime).toBeLessThan(3000); // Session should load in under 3 seconds
    }
  });

  test('Project switching performance', async () => {
    // Get all projects in the sidebar
    const projects = await page.locator('[data-testid^="project-"], [class*="project-item"]').all();
    
    if (projects.length >= 2) {
      const switchTimes: number[] = [];
      
      // Switch between projects multiple times
      for (let i = 0; i < Math.min(3, projects.length); i++) {
        const startTime = Date.now();
        
        await projects[i].click();
        
        // Wait for sessions to load
        await page.waitForSelector('[data-testid^="session-item"]', { 
          timeout: 5000 
        }).catch(() => {
          // Some projects might not have sessions
          return page.waitForTimeout(500);
        });
        
        const switchTime = Date.now() - startTime;
        switchTimes.push(switchTime);
        console.log(`🔄 Project ${i + 1} switch time: ${switchTime}ms`);
        
        await page.waitForTimeout(500); // Brief pause between switches
      }
      
      const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
      console.log(`📊 Average project switch time: ${avgSwitchTime}ms`);
      
      expect(avgSwitchTime).toBeLessThan(2000); // Under 2 seconds average
      expect(Math.max(...switchTimes)).toBeLessThan(3000); // No switch over 3 seconds
    }
  });

  test('Session creation and initialization performance', async () => {
    // Click create session button
    const createButton = await page.locator('[data-testid="create-session-button"], button:has-text("Create Session"), button:has-text("New Session")').first();
    
    if (await createButton.isVisible()) {
      const startTime = Date.now();
      await createButton.click();
      
      // Wait for dialog
      await page.waitForSelector('[role="dialog"], [data-testid="create-session-dialog"]', { 
        timeout: 2000 
      });
      
      const dialogLoadTime = Date.now() - startTime;
      console.log(`📝 Dialog load time: ${dialogLoadTime}ms`);
      
      // Fill in the prompt
      const promptInput = await page.locator('textarea[placeholder*="prompt"], textarea[placeholder*="Prompt"], input[placeholder*="prompt"]').first();
      await promptInput.fill('Performance test session - measure initialization time');
      
      // Submit
      const submitButton = await page.locator('button:has-text("Create"), button[type="submit"]').first();
      const sessionStartTime = Date.now();
      await submitButton.click();
      
      // Wait for session to start (status changes from initializing)
      await page.waitForFunction(() => {
        const statusElements = document.querySelectorAll('[data-testid*="status"], [class*="status"]');
        return Array.from(statusElements).some(el => 
          el.textContent?.toLowerCase().includes('running') ||
          el.textContent?.toLowerCase().includes('waiting')
        );
      }, { timeout: 30000 }).catch(() => {
        console.log('Session initialization timeout - might be normal for new sessions');
      });
      
      const initTime = Date.now() - sessionStartTime;
      console.log(`🚀 Session initialization time: ${initTime}ms`);
      
      expect(dialogLoadTime).toBeLessThan(500); // Dialog should open quickly
      expect(initTime).toBeLessThan(10000); // Session should initialize in under 10 seconds
    }
  });

  test('Terminal output rendering performance', async () => {
    // Find a session with terminal output
    const terminalTab = await page.locator('[data-testid="terminal-tab"], button:has-text("Terminal")').first();
    
    if (await terminalTab.isVisible()) {
      await terminalTab.click();
      await page.waitForTimeout(500);
      
      // Measure terminal rendering performance
      const terminalMetrics = await page.evaluate(() => {
        const terminal = document.querySelector('.xterm-screen');
        if (!terminal) return { error: 'Terminal not found' };
        
        // Count visible rows
        const rows = terminal.querySelectorAll('.xterm-row');
        
        // Measure reflow/repaint
        const startTime = performance.now();
        
        // Force reflow
        void (terminal as HTMLElement).offsetHeight;
        
        // Trigger some terminal operations
        (terminal as HTMLElement).scrollTop = (terminal as HTMLElement).scrollHeight;
        void (terminal as HTMLElement).offsetHeight;
        (terminal as HTMLElement).scrollTop = 0;
        void (terminal as HTMLElement).offsetHeight;
        
        const reflowTime = performance.now() - startTime;
        
        return {
          visibleRows: rows.length,
          reflowTime,
          terminalHeight: (terminal as HTMLElement).scrollHeight,
          viewportHeight: (terminal as HTMLElement).clientHeight
        };
      });
      
      console.log('🖥️ Terminal Performance:', terminalMetrics);
      
      if (!terminalMetrics.error) {
        expect(terminalMetrics.reflowTime).toBeLessThan(100); // Reflow under 100ms
      }
    }
  });

  test('Diff view rendering performance', async () => {
    // Navigate to diff view
    const diffTab = await page.locator('[data-testid="changes-tab"], button:has-text("Changes"), button:has-text("View Diff")').first();
    
    if (await diffTab.isVisible()) {
      const startTime = Date.now();
      await diffTab.click();
      
      // Wait for diff to render
      await page.waitForSelector('[class*="diff"], [data-testid="diff-view"]', { 
        timeout: 5000 
      }).catch(() => {
        console.log('No diff content available');
      });
      
      const diffLoadTime = Date.now() - startTime;
      console.log(`🔍 Diff view load time: ${diffLoadTime}ms`);
      
      // Measure diff scrolling performance
      const diffMetrics = await page.evaluate(async () => {
        const diffContainer = document.querySelector('[class*="diff-viewer"], [class*="diff-container"], [data-testid="diff-view"]');
        if (!diffContainer) return { error: 'Diff container not found' };
        
        const measurements: number[] = [];
        
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          (diffContainer as HTMLElement).scrollTop = i * 100;
          await new Promise(resolve => requestAnimationFrame(resolve));
          measurements.push(performance.now() - start);
        }
        
        return {
          avgScrollTime: measurements.reduce((a, b) => a + b, 0) / measurements.length,
          measurements
        };
      });
      
      console.log('📊 Diff scroll performance:', diffMetrics);
      
      expect(diffLoadTime).toBeLessThan(2000); // Diff should load in under 2 seconds
      if (!diffMetrics.error) {
        expect(diffMetrics.avgScrollTime).toBeLessThan(50); // Smooth scrolling
      }
    }
  });

  test('Memory usage during heavy operations', async () => {
    // Perform memory-intensive operations
    const memorySnapshots: any[] = [];
    
    // Take initial snapshot
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        timestamp: Date.now(),
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (initialMemory) {
      memorySnapshots.push({ ...initialMemory, label: 'initial' });
    }
    
    // Switch between multiple sessions
    const sessions = await page.locator('[data-testid^="session-item"]').all();
    
    for (let i = 0; i < Math.min(5, sessions.length); i++) {
      await sessions[i].click();
      await page.waitForTimeout(1000);
      
      const memory = await page.evaluate(() => {
        return (performance as any).memory ? {
          timestamp: Date.now(),
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (memory) {
        memorySnapshots.push({ ...memory, label: `after-session-${i + 1}` });
      }
    }
    
    // Analyze memory growth
    if (memorySnapshots.length > 1) {
      const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].used - memorySnapshots[0].used;
      const growthPercentage = (memoryGrowth / memorySnapshots[0].used) * 100;
      
      console.log('\n💾 Memory Analysis:');
      memorySnapshots.forEach(snapshot => {
        console.log(`${snapshot.label}: ${(snapshot.used / 1024 / 1024).toFixed(2)} MB`);
      });
      console.log(`Total growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB (${growthPercentage.toFixed(2)}%)`);
      
      // Save detailed report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(`crystal-memory-report-${timestamp}.json`, JSON.stringify({
        snapshots: memorySnapshots,
        analysis: {
          initialMemoryMB: memorySnapshots[0].used / 1024 / 1024,
          finalMemoryMB: memorySnapshots[memorySnapshots.length - 1].used / 1024 / 1024,
          growthMB: memoryGrowth / 1024 / 1024,
          growthPercentage
        }
      }, null, 2));
      
      // Assert reasonable memory growth
      expect(growthPercentage).toBeLessThan(100); // Less than 100% growth
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    }
  });

  test.afterEach(async () => {
    // Extract and save performance metrics if page is available
    if (page) {
      try {
        const metrics = await page.evaluate(() => {
          return (window as any).performanceMetrics || {};
        });
    
    if (metrics.renders && metrics.renders.length > 0) {
      console.log(`\n⚛️ React Renders: ${metrics.renders.length}`);
      
      // Calculate render frequency
      const renderTimes = metrics.renders.map((r: any) => r.time);
      const renderIntervals = [];
      for (let i = 1; i < renderTimes.length; i++) {
        renderIntervals.push(renderTimes[i] - renderTimes[i - 1]);
      }
      
      if (renderIntervals.length > 0) {
        const avgInterval = renderIntervals.reduce((a: number, b: number) => a + b, 0) / renderIntervals.length;
        console.log(`Average time between renders: ${avgInterval.toFixed(2)}ms`);
      }
    }
      } catch (error) {
        console.log('Could not extract performance metrics:', error);
      }
      
      await page.close();
    }
  });
});