import { test, expect, Page } from '@playwright/test';

/**
 * Auto-Scroll Tests for Crystal Application
 * Tests the auto-scroll to bottom functionality:
 * - When selecting a session from the sidebar
 * - When clicking the Output tab
 * - With various message volumes and scroll positions
 */

test.describe('Crystal Auto-Scroll Functionality', () => {
  
  /**
   * Helper to get scroll position of the output container
   */
  async function getScrollPosition(page: Page): Promise<{ scrollTop: number; scrollHeight: number; clientHeight: number }> {
    return await page.evaluate(() => {
      // Find the scrollable output container
      const container = document.querySelector('.xterm-viewport, [class*="output"], [role="main"], [data-testid="output-container"]');
      if (container) {
        return {
          scrollTop: (container as HTMLElement).scrollTop,
          scrollHeight: (container as HTMLElement).scrollHeight,
          clientHeight: (container as HTMLElement).clientHeight
        };
      }
      
      // Fallback to richOutput container
      const richOutput = document.querySelector('[class*="rich-output"], [class*="message"]');
      if (richOutput) {
        const scrollableParent = richOutput.closest('[style*="overflow"], [class*="scroll"]');
        if (scrollableParent) {
          return {
            scrollTop: (scrollableParent as HTMLElement).scrollTop,
            scrollHeight: (scrollableParent as HTMLElement).scrollHeight,
            clientHeight: (scrollableParent as HTMLElement).clientHeight
          };
        }
      }
      
      return { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
    });
  }
  
  /**
   * Helper to check if scrolled to bottom (within tolerance)
   */
  function isScrolledToBottom(scrollPos: { scrollTop: number; scrollHeight: number; clientHeight: number }): boolean {
    const tolerance = 50; // Allow 50px tolerance
    return scrollPos.scrollTop + scrollPos.clientHeight >= scrollPos.scrollHeight - tolerance;
  }
  
  /**
   * Helper to add test messages to create scrollable content
   */
  async function addTestMessages(page: Page, count: number = 50): Promise<void> {
    console.log(`  Adding ${count} test messages...`);
    
    await page.evaluate((messageCount) => {
      const messageContainer = document.querySelector('[data-testid="message-container"], .xterm-screen, .output-container, [class*="output"], [class*="rich-output"]');
      
      if (messageContainer) {
        for (let i = 0; i < messageCount; i++) {
          const messageDiv = document.createElement('div');
          messageDiv.className = 'test-auto-scroll-message';
          messageDiv.style.padding = '8px';
          messageDiv.style.borderBottom = '1px solid #333';
          messageDiv.style.minHeight = '40px';
          messageDiv.innerHTML = `
            <div>Auto-scroll test message ${i + 1}</div>
            <div style="font-size: 12px; color: #888;">
              This is a test message to create scrollable content for auto-scroll testing. 
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </div>
          `;
          messageContainer.appendChild(messageDiv);
        }
      }
    }, count);
    
    // Wait for content to render
    await page.waitForTimeout(500);
  }
  
  /**
   * Helper to scroll to a specific position
   */
  async function scrollToPosition(page: Page, position: 'top' | 'middle' | number): Promise<void> {
    await page.evaluate((pos) => {
      const container = document.querySelector('.xterm-viewport, [class*="output"], [role="main"], [data-testid="output-container"]');
      if (!container) return;
      
      const element = container as HTMLElement;
      
      if (pos === 'top') {
        element.scrollTop = 0;
      } else if (pos === 'middle') {
        element.scrollTop = element.scrollHeight / 2;
      } else if (typeof pos === 'number') {
        element.scrollTop = pos;
      }
    }, position);
    
    await page.waitForTimeout(200); // Allow scroll to complete
  }

  /**
   * Test auto-scroll when switching sessions
   */
  test('auto-scroll to bottom when selecting session from sidebar', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📜 Testing auto-scroll on session selection...');
    
    // Find available sessions
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length === 0) {
      console.log('No existing sessions found, creating test session...');
      
      // Try to create a session for testing
      const createButton = page.locator('[data-testid="create-session"], button:has-text("Create"), button:has-text("New Session")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(2000);
        
        // Check for sessions again
        const newSessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
        if (newSessions.length === 0) {
          console.log('⚠️ Could not create session for testing, skipping test');
          return;
        }
      }
    }
    
    // Get updated session list
    const availableSessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (availableSessions.length > 0) {
      // Select the first session
      await availableSessions[0].click();
      await page.waitForTimeout(1000);
      
      // Ensure we're in Output view mode
      const outputTab = page.locator('button:has-text("Output"), [data-testid="output-tab"], .tab:has-text("Output")').first();
      if (await outputTab.isVisible()) {
        await outputTab.click();
        await page.waitForTimeout(500);
      }
      
      // Add content to make it scrollable
      await addTestMessages(page, 30);
      
      // Scroll to top to test auto-scroll
      await scrollToPosition(page, 'top');
      
      // Verify we're at the top
      const initialScrollPos = await getScrollPosition(page);
      console.log(`  Initial scroll position: ${initialScrollPos.scrollTop}/${initialScrollPos.scrollHeight}`);
      expect(initialScrollPos.scrollTop).toBeLessThan(100);
      
      // Switch to another session if available, then back
      if (availableSessions.length > 1) {
        console.log('  Switching to different session first...');
        await availableSessions[1].click();
        await page.waitForTimeout(500);
        
        console.log('  Switching back to original session to test auto-scroll...');
        await availableSessions[0].click();
      } else {
        console.log('  Re-selecting the same session to trigger auto-scroll...');
        await availableSessions[0].click();
      }
      
      // Wait for auto-scroll to complete
      await page.waitForTimeout(1000);
      
      // Check if we auto-scrolled to bottom
      const finalScrollPos = await getScrollPosition(page);
      console.log(`  Final scroll position: ${finalScrollPos.scrollTop}/${finalScrollPos.scrollHeight}`);
      
      // Verify auto-scroll worked
      const isAtBottom = isScrolledToBottom(finalScrollPos);
      console.log(`  Is scrolled to bottom: ${isAtBottom}`);
      
      expect(isAtBottom).toBe(true);
      console.log('✅ Auto-scroll on session selection works correctly');
    }
  });

  /**
   * Test auto-scroll when clicking Output tab
   */
  test('auto-scroll to bottom when clicking Output tab', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📊 Testing auto-scroll on Output tab click...');
    
    // Find and select a session
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length === 0) {
      console.log('⚠️ No sessions available for testing Output tab auto-scroll');
      return;
    }
    
    await sessions[0].click();
    await page.waitForTimeout(1000);
    
    // Find the tab buttons (Output, Diff, Terminal, etc.)
    const outputTab = page.locator('button:has-text("Output"), [data-testid="output-tab"], .tab:has-text("Output")').first();
    const diffTab = page.locator('button:has-text("Diff"), button:has-text("View Diff"), [data-testid="diff-tab"], .tab:has-text("Diff")').first();
    
    if (!(await outputTab.isVisible())) {
      console.log('⚠️ Output tab not found, skipping Output tab auto-scroll test');
      return;
    }
    
    // Ensure we start in Output mode
    await outputTab.click();
    await page.waitForTimeout(500);
    
    // Add content to make it scrollable
    await addTestMessages(page, 40);
    
    // Scroll to middle position
    await scrollToPosition(page, 'middle');
    
    const middleScrollPos = await getScrollPosition(page);
    console.log(`  Scrolled to middle: ${middleScrollPos.scrollTop}/${middleScrollPos.scrollHeight}`);
    
    // Switch to a different tab if available
    if (await diffTab.isVisible()) {
      console.log('  Switching to Diff tab...');
      await diffTab.click();
      await page.waitForTimeout(500);
    }
    
    console.log('  Clicking Output tab to test auto-scroll...');
    await outputTab.click();
    
    // Wait for auto-scroll to complete
    await page.waitForTimeout(1000);
    
    // Check if we auto-scrolled to bottom
    const finalScrollPos = await getScrollPosition(page);
    console.log(`  Final scroll position after Output tab click: ${finalScrollPos.scrollTop}/${finalScrollPos.scrollHeight}`);
    
    // Verify auto-scroll worked
    const isAtBottom = isScrolledToBottom(finalScrollPos);
    console.log(`  Is scrolled to bottom: ${isAtBottom}`);
    
    expect(isAtBottom).toBe(true);
    console.log('✅ Auto-scroll on Output tab click works correctly');
  });

  /**
   * Test auto-scroll with heavy message load
   */
  test('auto-scroll works with long message history', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n📚 Testing auto-scroll with heavy message load...');
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length === 0) {
      console.log('⚠️ No sessions available for heavy load auto-scroll test');
      return;
    }
    
    await sessions[0].click();
    await page.waitForTimeout(1000);
    
    // Ensure Output tab is active
    const outputTab = page.locator('button:has-text("Output"), [data-testid="output-tab"], .tab:has-text("Output")').first();
    if (await outputTab.isVisible()) {
      await outputTab.click();
      await page.waitForTimeout(500);
    }
    
    // Add a large number of messages to stress test auto-scroll
    const messageCount = 200;
    console.log(`  Adding ${messageCount} messages for heavy load test...`);
    await addTestMessages(page, messageCount);
    
    // Get initial metrics
    const initialScrollPos = await getScrollPosition(page);
    console.log(`  Content height after adding messages: ${initialScrollPos.scrollHeight}px`);
    
    // Scroll to various positions and test auto-scroll each time
    const testPositions = ['top', 'middle', 100, 500];
    
    for (const position of testPositions) {
      console.log(`  Testing auto-scroll from ${position} position...`);
      
      // Scroll to test position
      await scrollToPosition(page, position as any);
      
      const beforeScrollPos = await getScrollPosition(page);
      console.log(`    Before session re-select: ${beforeScrollPos.scrollTop}px`);
      
      // Re-select session to trigger auto-scroll
      await sessions[0].click();
      
      // Wait for auto-scroll (might take longer with heavy content)
      await page.waitForTimeout(1500);
      
      const afterScrollPos = await getScrollPosition(page);
      console.log(`    After session re-select: ${afterScrollPos.scrollTop}px`);
      
      // Verify auto-scroll to bottom
      const isAtBottom = isScrolledToBottom(afterScrollPos);
      expect(isAtBottom).toBe(true);
      
      console.log(`    ✅ Auto-scroll from ${position} position successful`);
    }
    
    console.log('✅ Auto-scroll works correctly with heavy message load');
  });

  /**
   * Test auto-scroll performance (shouldn't cause UI hangs)
   */
  test('auto-scroll performance does not cause UI hangs', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n⚡ Testing auto-scroll performance...');
    
    // Add performance monitoring
    await page.addInitScript(() => {
      (window as any).autoScrollMetrics = {
        hangDetected: false,
        scrollDurations: [],
        longTasks: []
      };
      
      // Monitor long tasks during auto-scroll
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            (window as any).autoScrollMetrics.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime
            });
            
            if (entry.duration > 200) {
              (window as any).autoScrollMetrics.hangDetected = true;
            }
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    });
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length === 0) {
      console.log('⚠️ No sessions available for performance test');
      return;
    }
    
    await sessions[0].click();
    await page.waitForTimeout(500);
    
    // Add substantial content for performance testing
    await addTestMessages(page, 100);
    
    // Test multiple rapid session switches with auto-scroll
    console.log('  Testing rapid session switches with auto-scroll...');
    
    for (let i = 0; i < 10; i++) {
      await scrollToPosition(page, Math.random() * 1000); // Random scroll position
      
      const scrollStart = Date.now();
      
      // Trigger auto-scroll by re-selecting session
      await sessions[0].click();
      
      // Wait for scroll to complete
      await page.waitForTimeout(300);
      
      const scrollDuration = Date.now() - scrollStart;
      
      // Record scroll duration
      await page.evaluate((duration) => {
        (window as any).autoScrollMetrics.scrollDurations.push(duration);
      }, scrollDuration);
      
      console.log(`    Scroll ${i + 1}: ${scrollDuration}ms`);
      
      // Verify we're at bottom
      const scrollPos = await getScrollPosition(page);
      expect(isScrolledToBottom(scrollPos)).toBe(true);
    }
    
    // Get performance metrics
    const metrics = await page.evaluate(() => (window as any).autoScrollMetrics);
    
    const avgScrollDuration = metrics.scrollDurations.reduce((a: number, b: number) => a + b, 0) / metrics.scrollDurations.length;
    const maxScrollDuration = Math.max(...metrics.scrollDurations);
    
    console.log(`  Average scroll duration: ${avgScrollDuration.toFixed(2)}ms`);
    console.log(`  Max scroll duration: ${maxScrollDuration}ms`);
    console.log(`  Long tasks detected: ${metrics.longTasks.length}`);
    console.log(`  UI hang detected: ${metrics.hangDetected}`);
    
    // Performance assertions
    expect(metrics.hangDetected).toBe(false); // No severe UI hangs
    expect(maxScrollDuration).toBeLessThan(1000); // Max 1 second for auto-scroll
    expect(avgScrollDuration).toBeLessThan(500); // Average under 500ms
    expect(metrics.longTasks.length).toBeLessThan(3); // Minimal long tasks
    
    console.log('✅ Auto-scroll performance test passed');
  });

  /**
   * Test that auto-scroll uses smooth scrolling behavior
   */
  test('auto-scroll uses smooth scrolling animation', async ({ page }) => {
    test.setTimeout(60000); // 1 minute
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n🎬 Testing smooth scrolling animation...');
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length === 0) {
      console.log('⚠️ No sessions available for smooth scroll test');
      return;
    }
    
    await sessions[0].click();
    await page.waitForTimeout(500);
    
    // Add content for scrolling
    await addTestMessages(page, 50);
    
    // Scroll to top
    await scrollToPosition(page, 'top');
    
    // Monitor scroll behavior during auto-scroll
    await page.evaluate(() => {
      (window as any).scrollBehaviorTest = {
        scrollEvents: [],
        smoothScrollDetected: false
      };
      
      // Monitor scroll events to detect smooth scrolling
      const container = document.querySelector('.xterm-viewport, [class*="output"], [role="main"]');
      if (container) {
        container.addEventListener('scroll', () => {
          (window as any).scrollBehaviorTest.scrollEvents.push({
            scrollTop: (container as HTMLElement).scrollTop,
            timestamp: Date.now()
          });
        });
      }
      
      // Detect smooth scroll by checking CSS behavior
      const computedStyle = window.getComputedStyle(container as Element);
      if (computedStyle.scrollBehavior === 'smooth' || 
          (container as HTMLElement).style.scrollBehavior === 'smooth') {
        (window as any).scrollBehaviorTest.smoothScrollDetected = true;
      }
    });
    
    console.log('  Triggering auto-scroll to monitor animation...');
    
    // Trigger auto-scroll
    await sessions[0].click();
    
    // Wait for animation to complete
    await page.waitForTimeout(1500);
    
    // Analyze scroll behavior
    const scrollTest = await page.evaluate(() => (window as any).scrollBehaviorTest);
    
    console.log(`  Scroll events captured: ${scrollTest.scrollEvents.length}`);
    console.log(`  Smooth scroll CSS detected: ${scrollTest.smoothScrollDetected}`);
    
    // Verify smooth scrolling characteristics
    if (scrollTest.scrollEvents.length > 2) {
      const firstEvent = scrollTest.scrollEvents[0];
      const lastEvent = scrollTest.scrollEvents[scrollTest.scrollEvents.length - 1];
      const animationDuration = lastEvent.timestamp - firstEvent.timestamp;
      
      console.log(`  Animation duration: ${animationDuration}ms`);
      
      // Smooth scroll should take some time (not instant)
      expect(animationDuration).toBeGreaterThan(50);
      expect(animationDuration).toBeLessThan(2000);
      
      // Should have multiple scroll events indicating animation
      expect(scrollTest.scrollEvents.length).toBeGreaterThan(2);
    }
    
    // Verify final position is at bottom
    const finalScrollPos = await getScrollPosition(page);
    expect(isScrolledToBottom(finalScrollPos)).toBe(true);
    
    console.log('✅ Smooth scrolling animation test passed');
  });
});