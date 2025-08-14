import { test, expect, Page } from '@playwright/test';
import { writeFileSync } from 'fs';

/**
 * Realistic Stress Test for Crystal Application
 * Simulates actual usage patterns that cause UI hangs and spinning wheels:
 * - Multiple projects with multiple sessions
 * - Each session containing hundreds/thousands of messages
 * - Rapid switching between projects and sessions
 * - Adding messages to already loaded heavy sessions
 */

test.describe('Crystal Realistic Stress Test - UI Hang Prevention', () => {
  
  /**
   * Helper to detect UI hangs and spinning wheels
   */
  async function detectUIHang(page: Page, action: () => Promise<void>, actionName: string): Promise<{
    hangDetected: boolean;
    hangDuration: number;
    spinnerDetected: boolean;
  }> {
    let hangDetected = false;
    let hangDuration = 0;
    let spinnerDetected = false;
    
    // Start monitoring for hangs
    const startTime = Date.now();
    
    // Check for spinning wheels or loading indicators
    const spinnerCheck = page.waitForSelector(
      '[class*="spinner"], [class*="loading"], [class*="spin"], .animate-spin, [role="progressbar"]',
      { timeout: 250, state: 'visible' }
    ).then(() => {
      spinnerDetected = true;
      return true;
    }).catch(() => false);
    
    // Inject hang detection
    await page.evaluate(() => {
      (window as any).uiHangDetected = false;
      (window as any).lastInteraction = Date.now();
      
      // Try to detect if the UI is responsive
      let frameCount = 0;
      const checkResponsiveness = () => {
        frameCount++;
        const now = Date.now();
        const timeSinceLastFrame = now - (window as any).lastInteraction;
        
        if (timeSinceLastFrame > 100) { // UI frozen for > 100ms
          (window as any).uiHangDetected = true;
        }
        
        (window as any).lastInteraction = now;
        
        if (frameCount < 60) { // Check for 1 second (60 frames)
          requestAnimationFrame(checkResponsiveness);
        }
      };
      requestAnimationFrame(checkResponsiveness);
    });
    
    // Perform the action
    await action();
    
    // Wait a bit and check results
    await page.waitForTimeout(1000);
    
    hangDuration = Date.now() - startTime;
    hangDetected = await page.evaluate(() => (window as any).uiHangDetected);
    
    // Check if spinner appeared
    const hadSpinner = await spinnerCheck;
    
    // If spinner appeared, wait for it to disappear and measure time
    if (hadSpinner || spinnerDetected) {
      const spinnerGoneTime = Date.now();
      await page.waitForSelector(
        '[class*="spinner"], [class*="loading"], [class*="spin"], .animate-spin',
        { state: 'hidden', timeout: 30000 }
      ).catch(() => null);
      
      const spinnerDuration = Date.now() - spinnerGoneTime;
      console.log(`  ⏳ Spinner/loading indicator shown for ${spinnerDuration}ms during ${actionName}`);
    }
    
    return { hangDetected, hangDuration, spinnerDetected };
  }
  
  /**
   * Main stress test simulating real-world heavy usage
   */
  test('handle multiple projects with heavy message loads without UI hangs', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for comprehensive test
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n🔥 Starting realistic stress test...');
    console.log('Simulating: Multiple projects, heavy message loads, rapid switching\n');
    
    const testMetrics = {
      hangs: [],
      spinners: [],
      switchTimes: [],
      messageSendTimes: [],
      memorySnapshots: [],
      startTime: Date.now()
    };
    
    // Add comprehensive performance monitoring
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        hangs: 0,
        freezes: [],
        longTasks: [],
        interactions: []
      };
      
      // Monitor long tasks that block the UI
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            (window as any).performanceMetrics.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
            
            if (entry.duration > 100) {
              (window as any).performanceMetrics.hangs++;
            }
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
      
      // Track all user interactions
      ['click', 'keydown', 'scroll'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
          (window as any).performanceMetrics.interactions.push({
            type: eventType,
            timestamp: Date.now(),
            target: (e.target as HTMLElement)?.className || 'unknown'
          });
        });
      });
      
      // Monitor for animation frame drops (indicates UI freeze)
      let lastFrameTime = performance.now();
      const monitorFrameRate = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        
        if (deltaTime > 100) { // Severe frame drop
          (window as any).performanceMetrics.freezes.push({
            duration: deltaTime,
            timestamp: currentTime
          });
        }
        
        lastFrameTime = currentTime;
        requestAnimationFrame(monitorFrameRate);
      };
      requestAnimationFrame(monitorFrameRate);
    });
    
    // Step 1: Create or navigate to multiple projects with sessions
    console.log('📁 Step 1: Setting up multiple projects with heavy data...');
    
    // Check if we have existing projects/sessions
    const projectSelector = page.locator('[data-testid="project-selector"], [class*="project-selector"], select').first();
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    console.log(`Found ${sessions.length} existing sessions`);
    
    // Step 2: Simulate heavy message load in current session
    if (sessions.length > 0) {
      console.log('\n📝 Step 2: Adding messages to existing sessions...');
      
      for (let sessionIndex = 0; sessionIndex < Math.min(3, sessions.length); sessionIndex++) {
        console.log(`\nLoading session ${sessionIndex + 1}...`);
        
        // Test session switching performance
        const switchResult = await detectUIHang(
          page,
          async () => {
            await sessions[sessionIndex].click();
          },
          `switch to session ${sessionIndex + 1}`
        );
        
        testMetrics.switchTimes.push(switchResult.hangDuration);
        
        if (switchResult.hangDetected) {
          console.log(`  ⚠️ UI HANG detected during session switch! Duration: ${switchResult.hangDuration}ms`);
          testMetrics.hangs.push({
            action: `session-switch-${sessionIndex}`,
            duration: switchResult.hangDuration
          });
        }
        
        if (switchResult.spinnerDetected) {
          console.log(`  ⏳ Spinner detected during session switch`);
          testMetrics.spinners.push({
            action: `session-switch-${sessionIndex}`,
            duration: switchResult.hangDuration
          });
        }
        
        // Wait for session to fully load
        await page.waitForTimeout(1000);
        
        // Try to add messages to this session
        const inputArea = page.locator('textarea, [data-testid="message-input"], .input-area, [contenteditable="true"]').first();
        
        if (await inputArea.isVisible()) {
          console.log(`  Adding 50 messages to session ${sessionIndex + 1}...`);
          
          for (let i = 0; i < 50; i++) {
            // Test message sending performance
            const messageResult = await detectUIHang(
              page,
              async () => {
                await inputArea.fill(`Stress test message ${i + 1} for session ${sessionIndex + 1}: Testing UI responsiveness with heavy load`);
                await page.keyboard.press('Enter');
              },
              `send message ${i + 1}`
            );
            
            testMetrics.messageSendTimes.push(messageResult.hangDuration);
            
            if (messageResult.hangDetected) {
              console.log(`    ⚠️ UI HANG on message ${i + 1}! Duration: ${messageResult.hangDuration}ms`);
              testMetrics.hangs.push({
                action: `message-send-${sessionIndex}-${i}`,
                duration: messageResult.hangDuration
              });
            }
            
            // Small delay between messages
            if (i % 10 === 0) {
              await page.waitForTimeout(200);
              
              // Check memory periodically
              const memory = await page.evaluate(() => {
                if ((performance as any).memory) {
                  return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
                }
                return 0;
              });
              
              if (memory > 0) {
                testMetrics.memorySnapshots.push({ 
                  sessionIndex, 
                  messageCount: i, 
                  memoryMB: memory 
                });
                console.log(`    💾 Memory: ${memory.toFixed(2)} MB`);
              }
            }
          }
        }
      }
    }
    
    // Step 3: Rapid switching between sessions
    console.log('\n🔄 Step 3: Testing rapid session/project switching...');
    
    if (sessions.length >= 2) {
      console.log('Performing 20 rapid switches...');
      
      for (let i = 0; i < 20; i++) {
        const targetSession = sessions[i % sessions.length];
        
        const rapidSwitchResult = await detectUIHang(
          page,
          async () => {
            await targetSession.click();
          },
          `rapid switch ${i + 1}`
        );
        
        if (rapidSwitchResult.hangDetected) {
          console.log(`  ⚠️ HANG on rapid switch ${i + 1}: ${rapidSwitchResult.hangDuration}ms`);
          testMetrics.hangs.push({
            action: `rapid-switch-${i}`,
            duration: rapidSwitchResult.hangDuration
          });
        }
        
        if (rapidSwitchResult.spinnerDetected) {
          testMetrics.spinners.push({
            action: `rapid-switch-${i}`,
            duration: rapidSwitchResult.hangDuration
          });
        }
        
        // Very short delay to simulate rapid clicking
        await page.waitForTimeout(100);
      }
    }
    
    // Step 4: Test scrolling performance with heavy content
    console.log('\n📜 Step 4: Testing scroll performance with heavy content...');
    
    const scrollResult = await detectUIHang(
      page,
      async () => {
        // Scroll down
        await page.evaluate(() => {
          const container = document.querySelector('.xterm-viewport, [class*="output"], [role="main"]');
          if (container) {
            (container as HTMLElement).scrollTop = (container as HTMLElement).scrollHeight;
          }
        });
        
        await page.waitForTimeout(200);
        
        // Scroll up
        await page.evaluate(() => {
          const container = document.querySelector('.xterm-viewport, [class*="output"], [role="main"]');
          if (container) {
            (container as HTMLElement).scrollTop = 0;
          }
        });
      },
      'scroll test'
    );
    
    if (scrollResult.hangDetected) {
      console.log(`  ⚠️ UI HANG during scrolling: ${scrollResult.hangDuration}ms`);
      testMetrics.hangs.push({
        action: 'scroll',
        duration: scrollResult.hangDuration
      });
    }
    
    // Step 5: Get final performance metrics
    const performanceData = await page.evaluate(() => (window as any).performanceMetrics);
    
    // Generate comprehensive report
    const testDuration = Date.now() - testMetrics.startTime;
    const report = {
      summary: {
        testDuration: testDuration,
        totalHangs: testMetrics.hangs.length,
        totalSpinners: testMetrics.spinners.length,
        avgSwitchTime: testMetrics.switchTimes.reduce((a, b) => a + b, 0) / testMetrics.switchTimes.length || 0,
        avgMessageSendTime: testMetrics.messageSendTimes.reduce((a, b) => a + b, 0) / testMetrics.messageSendTimes.length || 0,
        maxMemoryMB: Math.max(...testMetrics.memorySnapshots.map(m => m.memoryMB), 0) || 0,
        longTasksCount: performanceData?.longTasks?.length || 0,
        freezesCount: performanceData?.freezes?.length || 0
      },
      hangs: testMetrics.hangs,
      spinners: testMetrics.spinners,
      longTasks: performanceData?.longTasks?.filter((t: any) => t.duration > 100) || [],
      freezes: performanceData?.freezes || [],
      memorySnapshots: testMetrics.memorySnapshots
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REALISTIC STRESS TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Test duration: ${(report.summary.testDuration / 1000).toFixed(2)}s`);
    console.log(`\n❌ UI HANGS: ${report.summary.totalHangs}`);
    console.log(`⏳ SPINNERS: ${report.summary.totalSpinners}`);
    console.log(`\nPerformance Metrics:`);
    console.log(`  Average session switch time: ${report.summary.avgSwitchTime.toFixed(2)}ms`);
    console.log(`  Average message send time: ${report.summary.avgMessageSendTime.toFixed(2)}ms`);
    console.log(`  Max memory usage: ${report.summary.maxMemoryMB.toFixed(2)} MB`);
    console.log(`  Long tasks (>100ms): ${report.summary.longTasksCount}`);
    console.log(`  Frame freezes: ${report.summary.freezesCount}`);
    
    if (report.hangs.length > 0) {
      console.log('\n⚠️ UI Hang Details:');
      report.hangs.slice(0, 5).forEach(hang => {
        console.log(`  - ${hang.action}: ${hang.duration}ms`);
      });
    }
    
    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(
      `realistic-stress-test-${timestamp}.json`,
      JSON.stringify(report, null, 2)
    );
    
    // ASSERTIONS - These are the critical performance requirements
    console.log('\n🎯 Performance Requirements Check:');
    
    // No severe UI hangs (> 500ms)
    const severeHangs = report.hangs.filter(h => h.duration > 500);
    console.log(`  Severe hangs (>500ms): ${severeHangs.length} (max allowed: 0)`);
    expect(severeHangs.length).toBe(0);
    
    // Limited spinners/loading states
    console.log(`  Loading spinners: ${report.summary.totalSpinners} (max allowed: 10)`);
    expect(report.summary.totalSpinners).toBeLessThan(10);
    
    // Reasonable switch times
    console.log(`  Avg switch time: ${report.summary.avgSwitchTime.toFixed(2)}ms (max allowed: 300ms)`);
    expect(report.summary.avgSwitchTime).toBeLessThan(300);
    
    // Reasonable message send times
    console.log(`  Avg message time: ${report.summary.avgMessageSendTime.toFixed(2)}ms (max allowed: 200ms)`);
    expect(report.summary.avgMessageSendTime).toBeLessThan(200);
    
    // Memory under control
    console.log(`  Max memory: ${report.summary.maxMemoryMB.toFixed(2)} MB (max allowed: 500MB)`);
    expect(report.summary.maxMemoryMB).toBeLessThan(500);
    
    console.log('\n✅ Realistic stress test completed!');
  });
  
  /**
   * Test specifically for the spinning wheel issue during message updates
   */
  test('prevent spinning wheel during message streaming', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes
    
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');
    
    console.log('\n🌀 Testing for spinning wheel prevention during message streaming...');
    
    const sessions = await page.locator('[data-testid^="session-item"], .session-item, [class*="session"]').all();
    
    if (sessions.length > 0) {
      await sessions[0].click();
      await page.waitForTimeout(500);
      
      const inputArea = page.locator('textarea, [data-testid="message-input"], .input-area').first();
      
      if (await inputArea.isVisible()) {
        // Monitor for spinning wheels specifically
        let spinnerCount = 0;
        let totalSpinnerTime = 0;
        
        for (let i = 0; i < 20; i++) {
          console.log(`Sending message ${i + 1}/20...`);
          
          const startTime = Date.now();
          
          // Check for spinner appearance
          const spinnerPromise = page.waitForSelector(
            '[class*="spinner"], [class*="loading"], [class*="spin"], .animate-spin',
            { timeout: 250, state: 'visible' }
          ).then(() => true).catch(() => false);
          
          // Send message
          await inputArea.fill(`Testing for spinning wheel ${i + 1}`);
          await page.keyboard.press('Enter');
          
          // Check if spinner appeared
          const hadSpinner = await spinnerPromise;
          
          if (hadSpinner) {
            spinnerCount++;
            const spinnerStart = Date.now();
            
            // Wait for spinner to disappear
            await page.waitForSelector(
              '[class*="spinner"], [class*="loading"], [class*="spin"], .animate-spin',
              { state: 'hidden', timeout: 10000 }
            ).catch(() => null);
            
            const spinnerDuration = Date.now() - spinnerStart;
            totalSpinnerTime += spinnerDuration;
            
            console.log(`  ⚠️ Spinner detected for ${spinnerDuration}ms`);
          }
          
          const responseTime = Date.now() - startTime;
          
          // UI should respond quickly without long spinners
          expect(responseTime).toBeLessThan(1000);
          
          await page.waitForTimeout(500); // Wait between messages
        }
        
        console.log(`\n📊 Spinner Statistics:`);
        console.log(`  Spinners shown: ${spinnerCount}/20 messages`);
        console.log(`  Total spinner time: ${totalSpinnerTime}ms`);
        console.log(`  Average spinner time: ${spinnerCount > 0 ? (totalSpinnerTime / spinnerCount).toFixed(2) : 0}ms`);
        
        // Spinners should be minimal
        expect(spinnerCount).toBeLessThan(5); // Max 5 spinners in 20 messages
        expect(totalSpinnerTime).toBeLessThan(5000); // Total spinner time under 5 seconds
      }
    }
  });
});