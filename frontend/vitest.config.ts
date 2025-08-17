import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // @ts-ignore - vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', '.nuxt', '.vercel'],
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
        'src/test/',
        '**/*.d.ts',
        'tests/',
        'dist/',
        'coverage/',
        '**/*.config.*',
        '**/index.{js,ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});