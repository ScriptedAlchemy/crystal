import { vi } from 'vitest';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      const paths: Record<string, string> = {
        home: '/home/test',
        userData: '/home/test/.config/Crystal',
        appData: '/home/test/.config',
        desktop: '/home/test/Desktop',
        documents: '/home/test/Documents',
        downloads: '/home/test/Downloads',
        temp: '/tmp'
      };
      return paths[name] || `/mock/${name}`;
    }),
    getName: vi.fn(() => 'Crystal'),
    getVersion: vi.fn(() => '1.0.0'),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    isPackaged: false
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      openDevTools: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      setUserAgent: vi.fn(),
      executeJavaScript: vi.fn()
    },
    show: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
    setTitle: vi.fn(),
    focus: vi.fn(),
    setIcon: vi.fn(),
    setMenuBarVisibility: vi.fn(),
    setAutoHideMenuBar: vi.fn()
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
    showErrorBox: vi.fn()
  },
  shell: {
    openExternal: vi.fn(),
    openPath: vi.fn()
  },
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn()
  },
  nativeTheme: {
    themeSource: 'system',
    shouldUseDarkColors: false
  }
}));

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
      store: {}
    }))
  };
});

// Mock node-pty
vi.mock('@homebridge/node-pty-prebuilt-multiarch', () => ({
  spawn: vi.fn().mockImplementation(() => ({
    write: vi.fn(),
    kill: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
    pid: 12345,
    resize: vi.fn()
  }))
}));

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([]), // Return empty array by default
        finalize: vi.fn()
      }),
      exec: vi.fn(),
      pragma: vi.fn(),
      close: vi.fn(),
      transaction: vi.fn((fn: Function) => fn)
    }))
  };
});

// Mock fs/promises to prevent actual file operations
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    rm: vi.fn()
  },
  access: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn(),
  rm: vi.fn()
}));

// Mock SessionManager to prevent initialization issues
vi.mock('../src/services/sessionManager', () => ({
  SessionManager: vi.fn().mockImplementation(() => ({
    initializeFromDatabase: vi.fn(),
    getActiveProject: vi.fn().mockReturnValue(null),
    on: vi.fn(),
    emit: vi.fn()
  }))
}));

// Set up global test environment
global.process = {
  ...process,
  platform: process.platform || 'darwin',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  },
  listeners: process.listeners ? process.listeners.bind(process) : () => [],
  on: process.on ? process.on.bind(process) : vi.fn(),
  off: process.off ? process.off.bind(process) : vi.fn(),
  once: process.once ? process.once.bind(process) : vi.fn(),
  removeListener: process.removeListener ? process.removeListener.bind(process) : vi.fn(),
  removeAllListeners: process.removeAllListeners ? process.removeAllListeners.bind(process) : vi.fn(),
  emit: process.emit ? process.emit.bind(process) : vi.fn()
};

// Suppress console output during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  };
}