// Test setup file for Vitest
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Electron API with comprehensive IPC methods
Object.defineProperty(window, 'electronAPI', {
  value: {
    // Session management
    sessions: {
      create: vi.fn(),
      getAll: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      getOutput: vi.fn(),
      sendInput: vi.fn(),
      continue: vi.fn(),
      stop: vi.fn(),
      getConversation: vi.fn(),
      rename: vi.fn(),
    },
    // Project management
    projects: {
      getAll: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      activate: vi.fn(),
      getAllWithSessions: vi.fn(),
    },
    // Git operations
    git: {
      pull: vi.fn(),
      push: vi.fn(),
      getDiff: vi.fn(),
      getStatus: vi.fn(),
      rebaseMainIntoWorktree: vi.fn(),
      squashAndRebaseToMain: vi.fn(),
      abortRebaseAndUseClaude: vi.fn(),
    },
    // Configuration
    config: {
      get: vi.fn(),
      set: vi.fn(),
    },
    // GitHub integration
    github: {
      getPRs: vi.fn(),
      getIssues: vi.fn(),
      getCIStatus: vi.fn(),
      getCILogs: vi.fn(),
      createFixSession: vi.fn(),
      createPR: vi.fn(),
    },
    // Prompts
    prompts: {
      getAll: vi.fn(),
      navigate: vi.fn(),
    },
    // Event listeners
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
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

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});
global.cancelAnimationFrame = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock CSS variables
Object.defineProperty(document.documentElement.style, 'getPropertyValue', {
  value: vi.fn(() => '#000000'),
  writable: true,
});

// Mock XTerm.js
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(),
    onKey: vi.fn(),
    loadAddon: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
    proposeDimensions: vi.fn(() => ({ cols: 80, rows: 24 })),
  })),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value }) => {
    return `<div data-testid="monaco-editor">${value}</div>`;
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '5 minutes ago'),
  format: vi.fn(() => '2024-01-01 12:00:00'),
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input) => input),
  },
}));