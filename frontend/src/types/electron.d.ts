// Type definitions for Electron preload API

import type { Session, CreateSessionRequest, GitStatus, GitCommands, GitErrorDetails } from './session';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from './project';
import type { Folder, CreateFolderRequest, UpdateFolderRequest } from './folder';
import type { CreateFixSessionRequest, CreatePRRequest, GitHubPR, GitHubIssue, GitHubCIStatus, CommitModeSettings } from '../../shared/types';

interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  command?: string;
}

interface ElectronAPI {
  // Generic invoke method for direct IPC calls
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
  
  // Basic app info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  isPackaged: () => Promise<boolean>;

  // Version checking
  checkForUpdates: () => Promise<IPCResponse>;
  getVersionInfo: () => Promise<IPCResponse>;
  
  // Auto-updater
  updater: {
    checkAndDownload: () => Promise<IPCResponse>;
    downloadUpdate: () => Promise<IPCResponse>;
    installUpdate: () => Promise<IPCResponse>;
  };

  // System utilities
  openExternal: (url: string) => Promise<void>;

  // Session management
  sessions: {
    getAll: () => Promise<IPCResponse>;
    getAllWithProjects: () => Promise<IPCResponse>;
    getArchivedWithProjects: () => Promise<IPCResponse>;
    get: (sessionId: string) => Promise<IPCResponse>;
    create: (request: CreateSessionRequest) => Promise<IPCResponse<Session>>;
    delete: (sessionId: string) => Promise<IPCResponse>;
    sendInput: (sessionId: string, input: string) => Promise<IPCResponse>;
    continue: (sessionId: string, prompt?: string, model?: string) => Promise<IPCResponse>;
    getOutput: (sessionId: string) => Promise<IPCResponse>;
    getJsonMessages: (sessionId: string) => Promise<IPCResponse>;
    getConversation: (sessionId: string) => Promise<IPCResponse>;
    getConversationMessages: (sessionId: string) => Promise<IPCResponse>;
    generateCompactedContext: (sessionId: string) => Promise<IPCResponse>;
    markViewed: (sessionId: string) => Promise<IPCResponse>;
    stop: (sessionId: string) => Promise<IPCResponse>;
    
    // Execution and Git operations
    getExecutions: (sessionId: string) => Promise<IPCResponse>;
    getExecutionDiff: (sessionId: string, executionId: string) => Promise<IPCResponse>;
    gitCommit: (sessionId: string, message: string) => Promise<IPCResponse>;
    gitDiff: (sessionId: string) => Promise<IPCResponse>;
    getCombinedDiff: (sessionId: string, executionIds?: number[]) => Promise<IPCResponse>;
    
    // Script operations
    hasRunScript: (sessionId: string) => Promise<IPCResponse>;
    getRunningSession: () => Promise<IPCResponse>;
    runScript: (sessionId: string) => Promise<IPCResponse>;
    stopScript: () => Promise<IPCResponse>;
    runTerminalCommand: (sessionId: string, command: string) => Promise<IPCResponse>;
    sendTerminalInput: (sessionId: string, data: string) => Promise<IPCResponse>;
    preCreateTerminal: (sessionId: string) => Promise<IPCResponse>;
    resizeTerminal: (sessionId: string, cols: number, rows: number) => Promise<IPCResponse>;
    
    // Prompt operations
    getPrompts: (sessionId: string) => Promise<IPCResponse>;
    
    // Git merge operations
    mergeMainToWorktree: (sessionId: string) => Promise<IPCResponse>;
    mergeWorktreeToMain: (sessionId: string) => Promise<IPCResponse>;
    
    // Git rebase operations
    rebaseMainIntoWorktree: (sessionId: string) => Promise<IPCResponse>;
    abortRebaseAndUseClaude: (sessionId: string) => Promise<IPCResponse>;
    squashAndRebaseToMain: (sessionId: string, commitMessage: string) => Promise<IPCResponse>;
    rebaseToMain: (sessionId: string) => Promise<IPCResponse>;
    hasChangesToRebase: (sessionId: string) => Promise<IPCResponse>;
    getGitCommands: (sessionId: string) => Promise<IPCResponse>;
    generateName: (prompt: string) => Promise<IPCResponse>;
    rename: (sessionId: string, newName: string) => Promise<IPCResponse>;
    toggleFavorite: (sessionId: string) => Promise<IPCResponse>;
    toggleAutoCommit: (sessionId: string) => Promise<IPCResponse>;

    // Main repo session
    getOrCreateMainRepoSession: (projectId: number) => Promise<IPCResponse>;

    // Git pull/push operations
    gitPull: (sessionId: string) => Promise<IPCResponse>;
    gitPush: (sessionId: string) => Promise<IPCResponse>;
    getGitStatus: (sessionId: string) => Promise<IPCResponse>;
    getLastCommits: (sessionId: string, count: number) => Promise<IPCResponse>;

    // IDE operations
    openIDE: (sessionId: string) => Promise<IPCResponse>;
    
    // Reorder operations
    reorder: (sessionOrders: Array<{ id: string; displayOrder: number }>) => Promise<IPCResponse>;
    
    // Image operations
    saveImages: (sessionId: string, images: Array<{ name: string; dataUrl: string; type: string }>) => Promise<string[]>;
    
    // Log operations
    getLogs: (sessionId: string) => Promise<IPCResponse>;
    clearLogs: (sessionId: string) => Promise<IPCResponse>;
    addLog: (sessionId: string, entry: {
      type: 'info' | 'warning' | 'error' | 'debug';
      message: string;
      details?: string;
      timestamp?: string;
    }) => Promise<IPCResponse>;
  };

  // Project management
  projects: {
    getAll: () => Promise<IPCResponse>;
    getActive: () => Promise<IPCResponse>;
    create: (projectData: CreateProjectRequest) => Promise<IPCResponse<Project>>;
    activate: (projectId: string) => Promise<IPCResponse>;
    update: (projectId: string, updates: UpdateProjectRequest) => Promise<IPCResponse<Project>>;
    delete: (projectId: string) => Promise<IPCResponse>;
    detectBranch: (path: string) => Promise<IPCResponse>;
    reorder: (projectOrders: Array<{ id: number; displayOrder: number }>) => Promise<IPCResponse>;
    listBranches: (projectId: string) => Promise<IPCResponse>;
  };

  // Git operations
  git: {
    detectBranch: (path: string) => Promise<IPCResponse<string>>;
    cancelStatusForProject: (projectId: number) => Promise<{ success: boolean; error?: string }>;
  };

  // Folders
  folders: {
    getByProject: (projectId: number) => Promise<IPCResponse>;
    create: (name: string, projectId: number, parentFolderId?: string | null) => Promise<IPCResponse>;
    update: (folderId: string, updates: { name?: string; display_order?: number; parent_folder_id?: string | null }) => Promise<IPCResponse>;
    delete: (folderId: string) => Promise<IPCResponse>;
    reorder: (projectId: number, folderIds: string[]) => Promise<IPCResponse>;
    moveSession: (sessionId: string, folderId: string | null) => Promise<IPCResponse>;
    move: (folderId: string, parentFolderId: string | null) => Promise<IPCResponse>;
  };

  // Configuration
  config: {
    get: () => Promise<IPCResponse>;
    update: (updates: Partial<{
      apiKey?: string;
      model?: string;
      verbose?: boolean;
      system_prompt_addon?: string;
      show_notifications?: boolean;
      play_sound_on_completion?: boolean;
      play_sound_on_waiting?: boolean;
      play_sound_on_error?: boolean;
      claude_path?: string;
      git_auto_squash?: boolean;
    }>) => Promise<IPCResponse>;
  };

  // Prompts
  prompts: {
    getAll: () => Promise<IPCResponse>;
    getByPromptId: (promptId: string) => Promise<IPCResponse>;
  };

  // File operations
  file: {
    listProject: (projectId: number, path?: string) => Promise<IPCResponse>;
    readProject: (projectId: number, filePath: string) => Promise<IPCResponse>;
  };

  // GitHub operations
  github: {
    getPRs: (projectId: number) => Promise<IPCResponse>;
    getIssues: (projectId: number) => Promise<IPCResponse>;
    getCIStatus: (projectId: number, prNumber: number) => Promise<IPCResponse>;
    getCILogs: (projectId: number, prNumber: number) => Promise<IPCResponse>;
    createFixSession: (request: CreateFixSessionRequest) => Promise<IPCResponse<Session>>;
    createPR: (request: CreatePRRequest) => Promise<IPCResponse<{ url: string }>>;
  };

  // Dialog
  dialog: {
    openFile: (options?: {
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
      properties?: Array<'openFile' | 'multiSelections'>;
    }) => Promise<IPCResponse<string | null>>;
    openDirectory: (options?: {
      defaultPath?: string;
      properties?: Array<'openDirectory' | 'createDirectory'>;
    }) => Promise<IPCResponse<string | null>>;
  };

  // Permissions
  permissions: {
    respond: (requestId: string, response: {
      behavior: 'allow' | 'deny';
      updatedInput?: unknown;
      message?: string;
    }) => Promise<IPCResponse>;
    getPending: () => Promise<IPCResponse>;
  };

  // Stravu MCP integration with OAuth
  stravu: {
    getConnectionStatus: () => Promise<IPCResponse>;
    initiateAuth: () => Promise<IPCResponse>;
    checkAuthStatus: (sessionId: string) => Promise<IPCResponse>;
    disconnect: () => Promise<IPCResponse>;
    getNotebooks: () => Promise<IPCResponse>;
    getNotebook: (notebookId: string) => Promise<IPCResponse>;
    searchNotebooks: (query: string, limit?: number) => Promise<IPCResponse>;
  };

  // Dashboard
  dashboard: {
    getProjectStatus: (projectId: number) => Promise<IPCResponse>;
    getProjectStatusProgressive: (projectId: number) => Promise<IPCResponse>;
    onUpdate: (callback: (data: {
      projectId: number;
      sessionCount: number;
      sessionStatuses: Record<string, Session['status']>;
    }) => void) => () => void;
    onSessionUpdate: (callback: (data: {
      sessionId: string;
      status: Session['status'];
      gitStatus?: GitStatus;
    }) => void) => () => void;
  };

  // UI State management
  uiState: {
    getExpanded: () => Promise<IPCResponse<{ expandedProjects: number[]; expandedFolders: string[] }>>;
    saveExpanded: (projectIds: number[], folderIds: string[]) => Promise<IPCResponse>;
    saveExpandedProjects: (projectIds: number[]) => Promise<IPCResponse>;
    saveExpandedFolders: (folderIds: string[]) => Promise<IPCResponse>;
  };

  // Event listeners for real-time updates
  events: {
    onSessionCreated: (callback: (session: Session) => void) => () => void;
    onSessionUpdated: (callback: (session: Session) => void) => () => void;
    onSessionDeleted: (callback: (session: { id: string }) => void) => () => void;
    onSessionsLoaded: (callback: (sessions: Session[]) => void) => () => void;
    onSessionOutput: (callback: (output: {
      sessionId: string;
      type: 'stdout' | 'stderr' | 'json' | 'error';
      data: string | unknown;
      timestamp: string;
    }) => void) => () => void;
    onSessionLog: (callback: (data: {
      sessionId: string;
      entry: {
        type: 'info' | 'warning' | 'error' | 'debug';
        message: string;
        details?: string;
        timestamp?: string;
      };
    }) => void) => () => void;
    onSessionLogsCleared: (callback: (data: { sessionId: string }) => void) => () => void;
    onSessionOutputAvailable: (callback: (info: {
      sessionId: string;
      outputIndex: number;
    }) => void) => () => void;
    onGitStatusUpdated: (callback: (data: { sessionId: string; gitStatus: GitStatus }) => void) => () => void;
    onGitStatusLoading: (callback: (data: { sessionId: string }) => void) => () => void;
    onGitStatusLoadingBatch?: (callback: (sessionIds: string[]) => void) => () => void;
    onGitStatusUpdatedBatch?: (callback: (updates: Array<{ sessionId: string; status: GitStatus }>) => void) => () => void;
    
    // Project events
    onProjectUpdated: (callback: (project: Project) => void) => () => void;
    
    // Folder events
    onFolderCreated: (callback: (folder: Folder) => void) => () => void;
    onFolderUpdated: (callback: (folder: Folder) => void) => () => void;
    onFolderDeleted: (callback: (folderId: string) => void) => () => void;
    
    onTerminalOutput: (callback: (output: {
      sessionId: string;
      data: string;
    }) => void) => () => void;
    onMainLog: (callback: (level: string, message: string) => void) => () => void;
    onVersionUpdateAvailable: (callback: (versionInfo: {
      latestVersion: string;
      currentVersion: string;
      downloadUrl: string;
      releaseNotes?: string;
    }) => void) => () => void;
    
    // Auto-updater events
    onUpdaterCheckingForUpdate: (callback: () => void) => () => void;
    onUpdaterUpdateAvailable: (callback: (info: {
      version: string;
      releaseNotes?: string;
      releaseName?: string;
      releaseDate: string;
    }) => void) => () => void;
    onUpdaterUpdateNotAvailable: (callback: (info: {
      version: string;
      releaseDate: string;
    }) => void) => () => void;
    onUpdaterDownloadProgress: (callback: (progressInfo: {
      bytesPerSecond: number;
      percent: number;
      transferred: number;
      total: number;
    }) => void) => () => void;
    onUpdaterUpdateDownloaded: (callback: (info: {
      version: string;
      releaseNotes?: string;
      releaseName?: string;
      releaseDate: string;
    }) => void) => () => void;
    onUpdaterError: (callback: (error: Error) => void) => () => void;
    
    // Process management events
    onZombieProcessesDetected: (callback: (data: { sessionId?: string | null; pids?: number[]; message: string }) => void) => () => void;
    
    removeAllListeners: (channel: string) => void;
  };

  // Debug utilities
  debug: {
    getTableStructure: (tableName: 'folders' | 'sessions') => Promise<IPCResponse<{
      columns: Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
      }>;
      foreignKeys: Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
        on_update: string;
        on_delete: string;
        match: string;
      }>;
      indexes: Array<{
        name: string;
        tbl_name: string;
        sql: string;
      }>;
    }>>;
  };
}

// Additional electron interface for IPC event listeners
interface ElectronInterface {
  openExternal: (url: string) => Promise<void>;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron?: ElectronInterface;
  }
}

export {};