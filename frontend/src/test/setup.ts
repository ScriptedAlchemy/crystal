// Test setup file for Vitest
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    github: {
      getPRs: vi.fn(),
      getIssues: vi.fn(),
      getCIStatus: vi.fn(),
      getCILogs: vi.fn(),
      createFixSession: vi.fn(),
      createPR: vi.fn(),
    },
  },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));