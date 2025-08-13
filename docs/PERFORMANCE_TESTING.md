# Crystal Performance Testing Guide

This guide covers the comprehensive performance testing setup for Crystal using Playwright and various performance monitoring tools.

## 🚀 Quick Start

```bash
# Run all performance tests
pnpm test:perf

# Run specific performance test types
pnpm test:lighthouse    # Lighthouse audits
pnpm test:profiling     # CPU/Memory profiling

# Run with UI for debugging
pnpm test:perf:ui
```

## 📊 Available Performance Tests

### 1. **Basic Performance Metrics** (`tests/performance.spec.ts`)
- Page load performance
- Session creation timing
- Terminal rendering performance
- Memory usage tracking

**Metrics Measured:**
- DOM Content Loaded time
- Memory heap usage
- Session operation duration
- Paint timing

### 2. **Lighthouse Performance Audits** (`tests/lighthouse-performance.spec.ts`)
- Comprehensive performance scoring
- Core Web Vitals measurement
- Performance bottleneck identification

**Metrics Measured:**
- Performance Score (0-100)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Speed Index
- Cumulative Layout Shift (CLS)
- Total Blocking Time (TBT)
- Time to Interactive (TTI)

### 3. **DevTools CPU & Memory Profiling** (`tests/devtools-profiling.spec.ts`)
- CPU usage profiling
- Memory heap analysis
- Network request monitoring
- Function-level performance tracking

**Outputs:**
- CPU hotspot identification
- Memory usage patterns
- Network request timing
- Detailed profiling JSON files

## 🎯 Performance Thresholds

### Current Targets:
- **Performance Score**: >70/100
- **First Contentful Paint**: <3000ms
- **Largest Contentful Paint**: <4000ms
- **Cumulative Layout Shift**: <0.25
- **Session Creation**: <5000ms
- **Memory Growth**: <50MB per operation
- **Frame Rate**: >30 FPS

## 📈 Understanding Results

### Lighthouse Scores
- **90-100**: Excellent
- **70-89**: Good  
- **50-69**: Needs Improvement
- **0-49**: Poor

### Core Web Vitals
- **FCP** (First Contentful Paint): How quickly content appears
- **LCP** (Largest Contentful Paint): When main content is loaded
- **CLS** (Cumulative Layout Shift): Visual stability
- **TBT** (Total Blocking Time): Main thread blocking

### CPU Profiling
- Identifies JavaScript functions taking the most time
- Highlights performance bottlenecks
- Shows call stack and execution time

### Memory Profiling
- Tracks heap usage over time
- Identifies memory leaks
- Shows garbage collection patterns

## 🔧 Debugging Performance Issues

### Common Issues in Electron Apps:
1. **Heavy DOM Manipulation**: Use virtual scrolling
2. **Memory Leaks**: Clean up event listeners
3. **Blocking Main Thread**: Move work to web workers
4. **Large Bundle Size**: Code splitting and lazy loading
5. **Inefficient Re-renders**: React optimization (memo, useMemo)

### Crystal-Specific Areas to Check:
1. **Terminal Output Rendering**: XTerm.js performance
2. **Session Switching**: State management overhead
3. **File Operations**: SQLite query performance  
4. **Git Operations**: Command execution time
5. **UI Updates**: React component optimization

## 📁 Generated Reports

Performance tests generate several output files:

```
├── lighthouse-report-TIMESTAMP.json     # Lighthouse audit results
├── cpu-profile-TIMESTAMP.json          # CPU profiling data
├── performance-results.json            # Test results summary
└── performance-report/                 # HTML reports
```

### Viewing Reports:
```bash
# View Lighthouse report
open lighthouse-report-*.json  # Import into DevTools

# View CPU profile  
open cpu-profile-*.json        # Import into DevTools Performance tab

# View HTML report
open performance-report/index.html
```

## 🎪 Advanced Usage

### Custom Performance Metrics
Add custom metrics in your tests:

```typescript
// Measure custom operation
const startTime = Date.now();
await performCustomOperation();
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(1000);
```

### Real User Monitoring (RUM)
Add RUM to the app for production monitoring:

```javascript
// In your app
window.addEventListener('load', () => {
  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
  analytics.track('page_load_time', { duration: loadTime });
});
```

### Continuous Performance Testing
Add to CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run performance tests
  run: pnpm test:perf
  
- name: Upload performance reports
  uses: actions/upload-artifact@v3
  with:
    name: performance-reports
    path: performance-report/
```

## 🚨 Performance Alerts

Set up alerts for performance regressions:

```typescript
// In your tests
test('Performance regression check', async ({ page }) => {
  const results = await runPerformanceTest(page);
  
  // Alert if performance drops below baseline
  expect(results.performanceScore).toBeGreaterThan(previousScore * 0.95);
});
```

## 💡 Tips

1. **Run tests in isolation**: Performance tests should run alone
2. **Use consistent hardware**: Results vary between machines  
3. **Clear cache**: Start with clean slate for consistent results
4. **Monitor trends**: Single runs can be noisy, track trends
5. **Profile in production**: Development builds have different characteristics

## 🔗 Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Playwright Performance](https://playwright.dev/docs/test-runners)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)