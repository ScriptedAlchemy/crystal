import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * React & Electron Performance Profiling
 * 
 * This test suite focuses on:
 * 1. React component render performance
 * 2. Electron main/renderer process communication (simulated via web)
 * 3. IPC message latency tracking
 * 4. Component render tracking
 * 5. Memory usage monitoring
 */

test.describe('Crystal React & Electron Performance', () => {
  let page: Page;
  let performanceData: any = {};

  test.beforeAll(async ({ browser }) => {
    // Create a new page with performance monitoring enabled
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to the app
    await page.goto('http://localhost:4521');
    await page.waitForLoadState('networkidle');

    // Inject React DevTools profiling
    await page.addInitScript(() => {
      // Enable React Profiler
      if ((window as any).React && (window as any).React.Profiler) {
        const Profiler = (window as any).React.Profiler;
        
        // Store profiling data
        (window as any).__CRYSTAL_PERF__ = {
          reactProfiles: [],
          ipcLatency: [],
          componentRenders: new Map(),
          slowComponents: []
        };

        // Hook into React DevTools
        if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
          
          // Track component renders
          const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
          hook.onCommitFiberRoot = function(id: any, root: any, priorityLevel: any) {
            if (root && root.current && root.current.memoizedState) {
              const renderTime = Date.now();
              const components: any[] = [];
              
              // Walk the fiber tree to find rendered components
              let fiber = root.current;
              const visited = new Set();
              const queue = [fiber];
              
              while (queue.length > 0) {
                const current = queue.shift();
                if (!current || visited.has(current)) continue;
                visited.add(current);
                
                if (current.elementType && current.elementType.name) {
                  const componentName = current.elementType.name;
                  const renderDuration = current.actualDuration || 0;
                  
                  components.push({
                    name: componentName,
                    duration: renderDuration,
                    timestamp: renderTime
                  });
                  
                  // Track slow components (>16ms render time)
                  if (renderDuration > 16) {
                    (window as any).__CRYSTAL_PERF__.slowComponents.push({
                      name: componentName,
                      duration: renderDuration,
                      timestamp: renderTime
                    });
                  }
                  
                  // Update component render stats
                  const stats = (window as any).__CRYSTAL_PERF__.componentRenders.get(componentName) || {
                    count: 0,
                    totalDuration: 0,
                    maxDuration: 0
                  };
                  stats.count++;
                  stats.totalDuration += renderDuration;
                  stats.maxDuration = Math.max(stats.maxDuration, renderDuration);
                  (window as any).__CRYSTAL_PERF__.componentRenders.set(componentName, stats);
                }
                
                if (current.child) queue.push(current.child);
                if (current.sibling) queue.push(current.sibling);
              }
              
              (window as any).__CRYSTAL_PERF__.reactProfiles.push({
                timestamp: renderTime,
                components,
                totalDuration: components.reduce((sum, c) => sum + c.duration, 0)
              });
            }
            
            if (originalOnCommitFiberRoot) {
              originalOnCommitFiberRoot.apply(this, arguments);
            }
          };
        }
      }

      // Track IPC communication latency
      if ((window as any).electron) {
        const ipcRenderer = (window as any).electron.ipcRenderer;
        const originalInvoke = ipcRenderer.invoke;
        
        ipcRenderer.invoke = async function(channel: string, ...args: any[]) {
          const startTime = performance.now();
          try {
            const result = await originalInvoke.call(this, channel, ...args);
            const duration = performance.now() - startTime;
            
            (window as any).__CRYSTAL_PERF__.ipcLatency.push({
              channel,
              duration,
              timestamp: Date.now(),
              args: args.length
            });
            
            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            (window as any).__CRYSTAL_PERF__.ipcLatency.push({
              channel,
              duration,
              timestamp: Date.now(),
              args: args.length,
              error: true
            });
            throw error;
          }
        };
      }
    });
  });

  test('React component render performance', async () => {
    
    // Navigate through different views to trigger renders
    await page.click('[data-testid="settings-button"]').catch(() => {});
    await page.waitForTimeout(500);
    await page.press('body', 'Escape');
    
    // Switch between sessions
    const sessions = await page.locator('[data-testid^="session-item"]').all();
    for (let i = 0; i < Math.min(3, sessions.length); i++) {
      await sessions[i].click();
      await page.waitForTimeout(500);
    }
    
    // Extract React performance data
    const perfData = await page.evaluate(() => {
      return (window as any).__CRYSTAL_PERF__ || {};
    });
    
    if (perfData.componentRenders && perfData.componentRenders.size > 0) {
      console.log('\n⚛️ React Component Performance:');
      console.log('─'.repeat(50));
      
      // Convert Map to array for analysis
      const components = Array.from(perfData.componentRenders.entries()).map(([name, stats]: [string, any]) => ({
        name,
        ...stats,
        avgDuration: stats.totalDuration / stats.count
      }));
      
      // Sort by total duration
      components.sort((a, b) => b.totalDuration - a.totalDuration);
      
      // Show top 10 components by render time
      components.slice(0, 10).forEach(comp => {
        console.log(`${comp.name}:`);
        console.log(`  Renders: ${comp.count}`);
        console.log(`  Avg Duration: ${comp.avgDuration.toFixed(2)}ms`);
        console.log(`  Max Duration: ${comp.maxDuration.toFixed(2)}ms`);
        console.log(`  Total Time: ${comp.totalDuration.toFixed(2)}ms`);
      });
      
      // Check for performance issues
      const slowComponents = components.filter(c => c.avgDuration > 16);
      if (slowComponents.length > 0) {
        console.log('\n⚠️ Slow Components (>16ms avg render):');
        slowComponents.forEach(comp => {
          console.log(`  - ${comp.name}: ${comp.avgDuration.toFixed(2)}ms avg`);
        });
      }
      
      performanceData.reactComponents = components;
      
      // Assertions
      const avgRenderTime = components.reduce((sum, c) => sum + c.avgDuration, 0) / components.length;
      expect(avgRenderTime).toBeLessThan(20); // Average render time under 20ms
    }
  });

  test('IPC communication latency', async () => {
    // Trigger various IPC calls
    await page.click('[data-testid="create-session-button"]').catch(() => {});
    await page.waitForTimeout(500);
    await page.press('body', 'Escape');
    
    // Get IPC latency data
    const ipcData = await page.evaluate(() => {
      return (window as any).__CRYSTAL_PERF__?.ipcLatency || [];
    });
    
    if (ipcData.length > 0) {
      console.log('\n📡 IPC Communication Performance:');
      console.log('─'.repeat(50));
      
      // Group by channel
      const channelStats = new Map();
      ipcData.forEach((call: any) => {
        const stats = channelStats.get(call.channel) || {
          count: 0,
          totalDuration: 0,
          maxDuration: 0,
          errors: 0
        };
        stats.count++;
        stats.totalDuration += call.duration;
        stats.maxDuration = Math.max(stats.maxDuration, call.duration);
        if (call.error) stats.errors++;
        channelStats.set(call.channel, stats);
      });
      
      // Display stats
      Array.from(channelStats.entries()).forEach(([channel, stats]: [string, any]) => {
        const avgDuration = stats.totalDuration / stats.count;
        console.log(`${channel}:`);
        console.log(`  Calls: ${stats.count}`);
        console.log(`  Avg Latency: ${avgDuration.toFixed(2)}ms`);
        console.log(`  Max Latency: ${stats.maxDuration.toFixed(2)}ms`);
        if (stats.errors > 0) {
          console.log(`  Errors: ${stats.errors}`);
        }
      });
      
      performanceData.ipcLatency = Array.from(channelStats.entries());
      
      // Assertions
      const avgLatency = ipcData.reduce((sum: number, call: any) => sum + call.duration, 0) / ipcData.length;
      expect(avgLatency).toBeLessThan(50); // Average IPC latency under 50ms
      
      // Check for slow IPC calls
      const slowCalls = ipcData.filter((call: any) => call.duration > 100);
      if (slowCalls.length > 0) {
        console.log('\n⚠️ Slow IPC Calls (>100ms):');
        slowCalls.forEach((call: any) => {
          console.log(`  - ${call.channel}: ${call.duration.toFixed(2)}ms`);
        });
      }
    }
  });

  test('Browser process metrics', async () => {
    // Get browser-level performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      const memory = (performance as any).memory;
      
      return {
        navigation: navigation ? {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          responseTime: navigation.responseEnd - navigation.requestStart
        } : null,
        paint: paint ? paint.startTime : null,
        memory: memory ? {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        } : null
      };
    });
    
    console.log('\n💻 Browser Performance Metrics:');
    console.log('─'.repeat(50));
    
    if (metrics.navigation) {
      console.log('Navigation Timing:');
      console.log(`  DOM Content Loaded: ${metrics.navigation.domContentLoaded.toFixed(2)}ms`);
      console.log(`  Load Complete: ${metrics.navigation.loadComplete.toFixed(2)}ms`);
      console.log(`  DOM Interactive: ${metrics.navigation.domInteractive.toFixed(2)}ms`);
      console.log(`  Response Time: ${metrics.navigation.responseTime.toFixed(2)}ms`);
    }
    
    if (metrics.paint) {
      console.log(`\nFirst Contentful Paint: ${metrics.paint.toFixed(2)}ms`);
    }
    
    if (metrics.memory) {
      const memoryUsedMB = metrics.memory.used / 1024 / 1024;
      const memoryTotalMB = metrics.memory.total / 1024 / 1024;
      const memoryLimitMB = metrics.memory.limit / 1024 / 1024;
      
      console.log('\nMemory Usage:');
      console.log(`  Used: ${memoryUsedMB.toFixed(2)} MB`);
      console.log(`  Total: ${memoryTotalMB.toFixed(2)} MB`);
      console.log(`  Limit: ${memoryLimitMB.toFixed(2)} MB`);
      console.log(`  Usage: ${((metrics.memory.used / metrics.memory.limit) * 100).toFixed(2)}%`);
      
      performanceData.memoryMetrics = metrics.memory;
      
      // Check memory usage
      expect(memoryUsedMB).toBeLessThan(500); // Memory usage under 500MB
    }
    
    performanceData.browserMetrics = metrics;
  });

  test('Database query performance (simulated)', async () => {
    // Note: Direct database monitoring requires Electron main process access
    // This test simulates database operations through UI interactions
    
    console.log('\n🗄️ Database Query Performance (via UI operations):');
    console.log('─'.repeat(50));
    
    // Measure operations that trigger database queries
    const operations = [
      {
        name: 'Load sessions',
        action: async () => {
          const start = performance.now();
          await page.click('[data-testid^="session-item"]').first().catch(() => {});
          await page.waitForSelector('[data-testid="output-container"], .xterm-screen', { timeout: 5000 }).catch(() => {});
          return performance.now() - start;
        }
      },
      {
        name: 'Switch projects',
        action: async () => {
          const start = performance.now();
          const projects = await page.locator('[data-testid^="project-"], [class*="project-item"]').all();
          if (projects.length > 1) {
            await projects[1].click();
            await page.waitForTimeout(500);
          }
          return performance.now() - start;
        }
      },
      {
        name: 'Load prompt history',
        action: async () => {
          const start = performance.now();
          const promptTab = await page.locator('[data-testid="prompts-tab"], button:has-text("Prompts")').first();
          if (await promptTab.isVisible()) {
            await promptTab.click();
            await page.waitForTimeout(500);
          }
          return performance.now() - start;
        }
      }
    ];
    
    const dbPerf: any[] = [];
    
    for (const op of operations) {
      try {
        const duration = await op.action();
        dbPerf.push({
          operation: op.name,
          duration: duration
        });
        console.log(`${op.name}: ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.log(`${op.name}: Skipped (element not found)`);
      }
    }
    
    if (dbPerf.length > 0) {
      console.log('\n🗄️ Database Query Performance:');
      console.log('─'.repeat(50));
      
      // Group by query type
      const queryStats = new Map();
      dbPerf.forEach((query: any) => {
        const queryType = query.sql.split(' ')[0].toUpperCase();
        const stats = queryStats.get(queryType) || {
          count: 0,
          totalDuration: 0,
          maxDuration: 0
        };
        stats.count++;
        stats.totalDuration += query.duration;
        stats.maxDuration = Math.max(stats.maxDuration, query.duration);
        queryStats.set(queryType, stats);
      });
      
      Array.from(queryStats.entries()).forEach(([type, stats]: [string, any]) => {
        console.log(`${type} Queries:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Avg Duration: ${(stats.totalDuration / stats.count).toFixed(2)}ms`);
        console.log(`  Max Duration: ${stats.maxDuration}ms`);
      });
      
      // Check for slow queries
      const slowQueries = dbPerf.filter((q: any) => q.duration > 100);
      if (slowQueries.length > 0) {
        console.log('\n⚠️ Slow Queries (>100ms):');
        slowQueries.forEach((q: any) => {
          console.log(`  - ${q.sql.substring(0, 50)}... : ${q.duration}ms`);
        });
      }
    }
  });

  test.afterAll(async () => {
    // Save comprehensive performance report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = 'performance-reports';
    
    try {
      mkdirSync(reportDir, { recursive: true });
    } catch {}
    
    const reportPath = join(reportDir, `crystal-performance-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(performanceData, null, 2));
    
    console.log(`\n📊 Performance report saved to: ${reportPath}`);
    
    // Close the page
    await page.close();
  });
});