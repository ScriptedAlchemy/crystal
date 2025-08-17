import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run tests serially to avoid race conditions and improve stability
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Disable file parallelism to run test files one at a time
    fileParallelism: false,
    // Alternative: use threads with maxThreads: 1
    // pool: 'threads',
    // poolOptions: {
    //   threads: {
    //     maxThreads: 1,
    //     minThreads: 1,
    //   },
    // },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        'src/index.ts',
        'src/preload.ts',
      ]
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});