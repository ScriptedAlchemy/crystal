import { test, expect, ElectronApplication, _electron as electron } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * React & Electron Performance Profiling
 * 
 * This test suite focuses on:
 * 1. React component render performance
 * 2. Electron main/renderer process communication
 * 3. IPC message latency
 * 4. SQLite database query performance
 * 5. File system operations
 */

test.describe('Crystal React & Electron Performance', () => {
  let electronApp: ElectronApplication;
  let performanceData: any = {};

  test.beforeAll(async () => {
    // Launch Electron app with performance flags
    electronApp = await electron.launch({
      args: [
        '.',
        '--enable-logging',
        '--enable-precise-memory-info',
        '--js-flags=--expose-gc',
        '--disable-background-timer-throttling'
      ],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        CRYSTAL_PERF_MODE: '1', // Enable performance monitoring in app
        ELECTRON_ENABLE_LOGGING: '1'
      }
    });

    // Wait for the first window to be ready
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Inject React DevTools profiling
    await window.addInitScript(() => {
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
    const window = await electronApp.firstWindow();
    
    // Navigate through different views to trigger renders
    await window.click('[data-testid="settings-button"]').catch(() => {});
    await window.waitForTimeout(500);
    await window.press('body', 'Escape');
    
    // Switch between sessions
    const sessions = await window.locator('[data-testid^="session-item"]').all();
    for (let i = 0; i < Math.min(3, sessions.length); i++) {
      await sessions[i].click();
      await window.waitForTimeout(500);
    }
    
    // Extract React performance data
    const perfData = await window.evaluate(() => {
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
    const window = await electronApp.firstWindow();
    
    // Trigger various IPC calls
    await window.click('[data-testid="create-session-button"]').catch(() => {});
    await window.waitForTimeout(500);
    await window.press('body', 'Escape');
    
    // Get IPC latency data
    const ipcData = await window.evaluate(() => {
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

  test('Electron process metrics', async () => {
    // Get main process metrics
    const mainMetrics = await electronApp.evaluate(async ({ app }) => {
      const metrics = app.getAppMetrics();
      return metrics;
    });
    
    console.log('\n💻 Electron Process Metrics:');
    console.log('─'.repeat(50));
    
    mainMetrics.forEach((process: any) => {
      console.log(`${process.type} Process (PID: ${process.pid}):`);
      console.log(`  CPU: ${process.cpu.percentCPUUsage.toFixed(2)}%`);
      console.log(`  Memory: ${(process.memory.workingSetSize / 1024).toFixed(2)} MB`);
      console.log(`  Sandboxed: ${process.sandboxed}`);
    });
    
    performanceData.processMetrics = mainMetrics;
    
    // Check for high CPU usage
    const highCPUProcesses = mainMetrics.filter((p: any) => p.cpu.percentCPUUsage > 50);
    if (highCPUProcesses.length > 0) {
      console.log('\n⚠️ High CPU Usage Detected:');
      highCPUProcesses.forEach((p: any) => {
        console.log(`  - ${p.type}: ${p.cpu.percentCPUUsage.toFixed(2)}%`);
      });
    }
    
    // Check total memory usage
    const totalMemory = mainMetrics.reduce((sum: number, p: any) => sum + p.memory.workingSetSize, 0) / 1024;
    console.log(`\nTotal Memory Usage: ${totalMemory.toFixed(2)} MB`);
    
    expect(totalMemory).toBeLessThan(1024); // Total memory under 1GB
  });

  test('Database query performance', async () => {
    const window = await electronApp.firstWindow();
    
    // Inject database performance monitoring
    await electronApp.evaluate(async ({ app }) => {
      // This would need to be implemented in the main process
      // to track SQLite query performance
      const db = (global as any).database;
      if (db) {
        const originalPrepare = db.prepare;
        (global as any).__DB_PERF__ = [];
        
        db.prepare = function(sql: string) {
          const statement = originalPrepare.call(this, sql);
          const originalRun = statement.run;
          const originalGet = statement.get;
          const originalAll = statement.all;
          
          statement.run = function(...args: any[]) {
            const start = Date.now();
            const result = originalRun.apply(this, args);
            const duration = Date.now() - start;
            (global as any).__DB_PERF__.push({ sql, operation: 'run', duration });
            return result;
          };
          
          statement.get = function(...args: any[]) {
            const start = Date.now();
            const result = originalGet.apply(this, args);
            const duration = Date.now() - start;
            (global as any).__DB_PERF__.push({ sql, operation: 'get', duration });
            return result;
          };
          
          statement.all = function(...args: any[]) {
            const start = Date.now();
            const result = originalAll.apply(this, args);
            const duration = Date.now() - start;
            (global as any).__DB_PERF__.push({ sql, operation: 'all', duration });
            return result;
          };
          
          return statement;
        };
      }
    }).catch(() => {
      console.log('Database performance monitoring not available');
    });
    
    // Trigger database operations
    await window.click('[data-testid^="session-item"]').first().catch(() => {});
    await window.waitForTimeout(1000);
    
    // Get database performance data
    const dbPerf = await electronApp.evaluate(() => {
      return (global as any).__DB_PERF__ || [];
    }).catch(() => []);
    
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
    
    // Close the app
    await electronApp.close();
  });
});