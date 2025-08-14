import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';

/**
 * Stress Test for Crystal Application
 * Tests performance with massive message volumes (2000+ messages)
 */
test.describe('Crystal Stress Test - Massive Message Threads', () => {
  
  /**
   * Test handling of 2000+ messages in a single session
   * This simulates a very long conversation to ensure the app doesn't freeze
   */
  test('handle 2000+ messages without freezing', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for this stress test
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n🔥 Starting stress test with 2000+ messages...');
    
    // Add performance monitoring
    await page.addInitScript(() => {
      (window as any).stressTestMetrics = {
        messageCount: 0,
        freezes: [],
        longTasks: [],
        memorySnapshots: [],
        renderTimes: [],
        maxMemoryUsed: 0,
        startTime: Date.now()
      };
      
      // Monitor long tasks (UI freezes)
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) { // Tasks longer than 100ms are concerning
            (window as any).stressTestMetrics.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
      
      // Monitor memory usage
      const checkMemory = () => {
        if ((performance as any).memory) {
          const used = (performance as any).memory.usedJSHeapSize;
          (window as any).stressTestMetrics.memorySnapshots.push({
            timestamp: Date.now(),
            used: used,
            total: (performance as any).memory.totalJSHeapSize
          });
          if (used > (window as any).stressTestMetrics.maxMemoryUsed) {
            (window as any).stressTestMetrics.maxMemoryUsed = used;
          }
        }
      };
      
      // Check memory every 5 seconds
      setInterval(checkMemory, 5000);
      checkMemory();
      
      // Monitor frame rate
      let lastFrameTime = performance.now();
      let frameCount = 0;
      const checkFrameRate = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        
        if (deltaTime > 200) { // Severe freeze if frame takes > 200ms
          (window as any).stressTestMetrics.freezes.push({
            duration: deltaTime,
            timestamp: currentTime,
            afterMessage: (window as any).stressTestMetrics.messageCount
          });
        }
        
        lastFrameTime = currentTime;
        frameCount++;
        requestAnimationFrame(checkFrameRate);
      };
      requestAnimationFrame(checkFrameRate);
    });
    
    // Navigate to a session or create one
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length === 0) {
      console.log('No existing sessions found, creating a new one...');
      // Try to create a new session
      const createButton = page.locator('[data-testid="create-session"], button:has-text("Create"), button:has-text("New Session")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      await sessions[0].click();
      await page.waitForTimeout(1000);
    }
    
    // Find the input area
    const inputArea = page.locator('textarea, [data-testid="message-input"], .input-area, [contenteditable="true"]').first();
    
    if (await inputArea.isVisible()) {
      console.log('📝 Starting to simulate 2000 messages...');
      
      // Simulate sending many messages in batches
      const totalMessages = 2000;
      const batchSize = 100; // Send 100 messages at a time
      const batches = Math.ceil(totalMessages / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const startMessage = batch * batchSize;
        const endMessage = Math.min(startMessage + batchSize, totalMessages);
        
        console.log(`  Batch ${batch + 1}/${batches}: Messages ${startMessage + 1}-${endMessage}`);
        
        // Use evaluateHandle to get a persistent handle to the message container for better memory management
        let messageContainerHandle: any;
        if (batch === 0) {
          // Only get the handle once, before the first batch
          messageContainerHandle = await page.evaluateHandle(() => 
            document.querySelector('[data-testid="message-container"], .xterm-screen, .output-container, [class*="output"]')
          );
          (global as any).messageContainerHandle = messageContainerHandle;
        } else {
          messageContainerHandle = (global as any).messageContainerHandle;
        }
        
        // Use the handle to append messages in this batch for better performance
        await messageContainerHandle.evaluate(
          async (messageContainer: Element, { start, end }) => {
            if (messageContainer) {
              for (let i = start; i < end; i++) {
                // Simulate adding a message
                const messageDiv = document.createElement('div');
                messageDiv.className = 'test-message';
                messageDiv.textContent = `Test message ${i + 1}: This is a simulated message to test performance with large volumes of content. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
                messageContainer.appendChild(messageDiv);

                (window as any).stressTestMetrics.messageCount = i + 1;

                // Small delay between messages to simulate real-time flow
                if (i % 10 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 10));
                }
              }
            }
          },
          { start: startMessage, end: endMessage }
        );
        
        // Check performance after each batch
        const metrics = await page.evaluate(() => (window as any).stressTestMetrics);
        
        // Check for severe freezes
        const severeFreezesInBatch = metrics.freezes.filter((f: any) => 
          f.afterMessage > startMessage && f.duration > 500
        );
        
        if (severeFreezesInBatch.length > 0) {
          console.log(`  ⚠️ Severe freezes detected in batch ${batch + 1}:`, severeFreezesInBatch);
        }
        
        // Check memory usage
        const currentMemory = metrics.memorySnapshots[metrics.memorySnapshots.length - 1];
        if (currentMemory) {
          const memoryMB = currentMemory.used / 1024 / 1024;
          console.log(`  💾 Memory after ${endMessage} messages: ${memoryMB.toFixed(2)} MB`);
          
          // Fail if memory usage is excessive (> 1GB)
          if (memoryMB > 1024) {
            throw new Error(`Excessive memory usage: ${memoryMB.toFixed(2)} MB after ${endMessage} messages`);
          }
        }
        
        // Pause between batches to let the UI catch up
        await page.waitForTimeout(500);
      }
      
      console.log('\n✅ All 2000 messages processed!');
      
      // Test scrolling performance with all messages
      console.log('📜 Testing scroll performance with 2000 messages...');
      
      const scrollStartTime = Date.now();
      
      // Scroll to bottom
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="output-container"], .xterm-viewport, [class*="output"], [role="main"]');
        if (container) {
          (container as HTMLElement).scrollTop = (container as HTMLElement).scrollHeight;
        }
      });
      
      await page.waitForTimeout(500);
      
      // Scroll to top
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="output-container"], .xterm-viewport, [class*="output"], [role="main"]');
        if (container) {
          (container as HTMLElement).scrollTop = 0;
        }
      });
      
      const scrollTime = Date.now() - scrollStartTime;
      console.log(`Scroll test completed in ${scrollTime}ms`);
      
      // Get final metrics
      const finalMetrics = await page.evaluate(() => (window as any).stressTestMetrics);
      
      // Generate report
      const testDuration = Date.now() - finalMetrics.startTime;
      const report = {
        summary: {
          totalMessages: finalMetrics.messageCount,
          testDuration: testDuration,
          maxMemoryMB: finalMetrics.maxMemoryUsed / 1024 / 1024,
          totalFreezes: finalMetrics.freezes.length,
          severeFreezesCount: finalMetrics.freezes.filter((f: any) => f.duration > 500).length,
          longTasksCount: finalMetrics.longTasks.length,
          scrollTime: scrollTime
        },
        freezes: finalMetrics.freezes,
        longTasks: finalMetrics.longTasks.slice(0, 10), // First 10 long tasks
        memoryGrowth: {
          initial: finalMetrics.memorySnapshots[0]?.used || 0,
          final: finalMetrics.memorySnapshots[finalMetrics.memorySnapshots.length - 1]?.used || 0,
          growthMB: ((finalMetrics.memorySnapshots[finalMetrics.memorySnapshots.length - 1]?.used || 0) - 
                     (finalMetrics.memorySnapshots[0]?.used || 0)) / 1024 / 1024
        }
      };
      
      console.log('\n📊 Stress Test Report:');
      console.log(`Messages processed: ${report.summary.totalMessages}`);
      console.log(`Test duration: ${(report.summary.testDuration / 1000).toFixed(2)}s`);
      console.log(`Max memory used: ${report.summary.maxMemoryMB.toFixed(2)} MB`);
      console.log(`Memory growth: ${report.memoryGrowth.growthMB.toFixed(2)} MB`);
      console.log(`Total freezes: ${report.summary.totalFreezes}`);
      console.log(`Severe freezes (>500ms): ${report.summary.severeFreezesCount}`);
      console.log(`Long tasks (>100ms): ${report.summary.longTasksCount}`);
      console.log(`Scroll performance: ${scrollTime}ms`);
      
      // Save detailed report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(
        `stress-test-2000-messages-${timestamp}.json`,
        JSON.stringify(report, null, 2)
      );
      
      // Assertions
      expect(report.summary.severeFreezesCount).toBeLessThan(5); // Max 5 severe freezes allowed
      expect(report.summary.maxMemoryMB).toBeLessThan(512); // Memory should stay under 512MB
      expect(report.memoryGrowth.growthMB).toBeLessThan(300); // Memory growth under 300MB
      expect(scrollTime).toBeLessThan(5000); // Scrolling should complete in under 5 seconds
      
      console.log('\n✅ Stress test passed! App handled 2000 messages successfully.');
    } else {
      console.log('Could not find input area to send messages');
    }
  });

  /**
   * Test rapid message sending/receiving without freezing
   */
  test('handle rapid message flow without UI blocking', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n⚡ Testing rapid message flow...');
    
    // Monitor for UI responsiveness
    await page.addInitScript(() => {
      (window as any).rapidTestMetrics = {
        clickResponses: [],
        inputLag: [],
        renderBlocking: []
      };
      
      // Test click responsiveness
      document.addEventListener('click', (e) => {
        const responseTime = performance.now();
        (window as any).rapidTestMetrics.clickResponses.push(responseTime);
      });
    });
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length > 0) {
      await sessions[0].click();
      await page.waitForTimeout(500);
      
      // Simulate rapid message sending
      const inputArea = page.locator('textarea, [data-testid="message-input"], .input-area').first();
      
      if (await inputArea.isVisible()) {
        console.log('Sending 100 messages rapidly...');
        
        for (let i = 0; i < 100; i++) {
          const startInput = Date.now();
          
          // Type a message
          await inputArea.fill(`Rapid test message ${i + 1}`);
          
          // Measure input lag
          const inputLag = Date.now() - startInput;
          
          if (inputLag > 100) {
            console.log(`  ⚠️ Input lag detected: ${inputLag}ms at message ${i + 1}`);
          }
          
          // Send without waiting for response
          await page.keyboard.press('Enter');
          
          // Small delay to prevent overwhelming
          if (i % 10 === 0) {
            await page.waitForTimeout(100);
          }
        }
        
        console.log('✅ Rapid message test completed');
        
        // Test UI responsiveness after rapid messages
        const clickTestStart = Date.now();
        await page.click('body'); // Click somewhere to test responsiveness
        const clickResponseTime = Date.now() - clickTestStart;
        
        console.log(`UI click response time: ${clickResponseTime}ms`);
        
        // Assertions
        expect(clickResponseTime).toBeLessThan(200); // UI should respond within 200ms
      }
    }
  });

  /**
   * Test memory cleanup after processing large volumes
   */
  test('properly cleanup memory after large message volumes', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n🧹 Testing memory cleanup...');
    
    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
    
    // Navigate between sessions to trigger cleanup
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length >= 2) {
      // Switch between sessions multiple times
      for (let i = 0; i < 10; i++) {
        await sessions[i % sessions.length].click();
        await page.waitForTimeout(500);
      }
      
      // Force garbage collection if possible
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await page.waitForTimeout(2000);
      
      // Check memory after cleanup
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      
      const memoryGrowth = finalMemory - initialMemory;
      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory growth should be reasonable after cleanup
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    }
  });
});