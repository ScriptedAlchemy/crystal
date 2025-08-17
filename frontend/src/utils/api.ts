// Utility for making API calls using Electron IPC

// Type for IPC response
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  command?: string;
}

// Check if we're running in Electron
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

// Wrapper class for API calls that provides error handling and consistent interface
class ElectronAPI {
  // Session management
  static sessions = {
    async getAll() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getAll();
    },

    async getAllWithProjects() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getAllWithProjects();
    },

    async getArchivedWithProjects() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getArchivedWithProjects();
    },

    async get(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.get(sessionId);
    },

    async create(request: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.create(request);
    },

    async delete(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.delete(sessionId);
    },

    async sendInput(sessionId: string, input: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.sendInput(sessionId, input);
    },

    async continue(sessionId: string, prompt?: string, model?: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.continue(sessionId, prompt, model);
    },

    async getOutput(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getOutput(sessionId);
    },
    async getJsonMessages(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getJsonMessages(sessionId);
    },

    async getConversation(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getConversation(sessionId);
    },

    async getConversationMessages(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getConversationMessages(sessionId);
    },

    async markViewed(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.markViewed(sessionId);
    },

    async stop(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.stop(sessionId);
    },

    async getExecutions(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getExecutions(sessionId);
    },

    async getExecutionDiff(sessionId: string, executionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getExecutionDiff(sessionId, executionId);
    },

    async gitCommit(sessionId: string, message: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.gitCommit(sessionId, message);
    },

    async gitDiff(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.gitDiff(sessionId);
    },

    async getCombinedDiff(sessionId: string, executionIds?: number[]) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getCombinedDiff(sessionId, executionIds);
    },

    // Main repo session
    async getOrCreateMainRepoSession(projectId: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getOrCreateMainRepoSession(projectId);
    },

    // Script operations
    async hasRunScript(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.hasRunScript(sessionId);
    },

    async getRunningSession() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getRunningSession();
    },

    async runScript(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.runScript(sessionId);
    },

    async stopScript() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.stopScript();
    },

    async runTerminalCommand(sessionId: string, command: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.runTerminalCommand(sessionId, command);
    },

    async sendTerminalInput(sessionId: string, data: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.sendTerminalInput(sessionId, data);
    },

    async preCreateTerminal(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.preCreateTerminal(sessionId);
    },

    async resizeTerminal(sessionId: string, cols: number, rows: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.resizeTerminal(sessionId, cols, rows);
    },

    // Prompt operations
    async getPrompts(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getPrompts(sessionId);
    },

    // Git rebase operations
    async rebaseMainIntoWorktree(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.rebaseMainIntoWorktree(sessionId);
    },

    async abortRebaseAndUseClaude(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.abortRebaseAndUseClaude(sessionId);
    },

    async squashAndRebaseToMain(sessionId: string, commitMessage: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.squashAndRebaseToMain(sessionId, commitMessage);
    },

    async rebaseToMain(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.rebaseToMain(sessionId);
    },

    // Git operation helpers
    async hasChangesToRebase(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.hasChangesToRebase(sessionId);
    },

    async generateName(prompt: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.generateName(prompt);
    },

    async rename(sessionId: string, newName: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.rename(sessionId, newName);
    },

    async toggleFavorite(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.toggleFavorite(sessionId);
    },

    async toggleAutoCommit(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.toggleAutoCommit(sessionId);
    },

    async getGitCommands(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getGitCommands(sessionId);
    },

    // Git pull/push operations
    async gitPull(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.gitPull(sessionId);
    },

    async gitPush(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.gitPush(sessionId);
    },

    async getGitStatus(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getGitStatus(sessionId);
    },

    async getLastCommits(sessionId: string, count: number = 20) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.getLastCommits(sessionId, count);
    },

    async openIDE(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.openIDE(sessionId);
    },

    async reorder(sessionOrders: Array<{ id: string; displayOrder: number }>) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.reorder(sessionOrders);
    },

    async generateCompactedContext(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.sessions.generateCompactedContext(sessionId);
    },

  };

  // Project management
  static projects = {
    async getAll() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.getAll();
    },

    async getActive() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.getActive();
    },

    async create(projectData: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.create(projectData);
    },

    async activate(projectId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.activate(projectId);
    },

    async update(projectId: string, updates: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.update(projectId, updates);
    },

    async delete(projectId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.delete(projectId);
    },

    async detectBranch(path: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.detectBranch(path);
    },

    async reorder(projectOrders: Array<{ id: number; displayOrder: number }>) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.reorder(projectOrders);
    },

    async listBranches(projectId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.projects.listBranches(projectId);
    },
  };

  // Folders
  static folders = {
    async getByProject(projectId: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.getByProject(projectId);
    },

    async create(name: string, projectId: number, parentFolderId?: string | null) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.create(name, projectId, parentFolderId);
    },

    async update(folderId: string, updates: { name?: string; display_order?: number; parent_folder_id?: string | null }) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.update(folderId, updates);
    },

    async delete(folderId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.delete(folderId);
    },

    async reorder(projectId: number, folderIds: string[]) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.reorder(projectId, folderIds);
    },

    async moveSession(sessionId: string, folderId: string | null) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.moveSession(sessionId, folderId);
    },

    async move(folderId: string, parentFolderId: string | null) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.folders.move(folderId, parentFolderId);
    },
  };

  // Configuration
  static config = {
    async get() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.config.get();
    },

    async update(updates: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.config.update(updates);
    },
  };

  // Prompts
  static prompts = {
    async getAll() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.prompts.getAll();
    },
    
    async getByPromptId(promptId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.prompts.getByPromptId(promptId);
    },
  };

  // Dialog
  static dialog = {
    async openFile(options?: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.dialog.openFile(options);
    },

    async openDirectory(options?: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.dialog.openDirectory(options);
    },
  };

  // Permissions
  static permissions = {
    async respond(requestId: string, response: any) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.permissions.respond(requestId, response);
    },

    async getPending() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.permissions.getPending();
    },
  };

  // Version and updates
  static async checkForUpdates() {
    if (!isElectron()) throw new Error('Electron API not available');
    return window.electronAPI.checkForUpdates();
  }

  static async getVersionInfo() {
    if (!isElectron()) throw new Error('Electron API not available');
    return window.electronAPI.getVersionInfo();
  }

  // Stravu MCP integration with OAuth
  static stravu = {
    async getConnectionStatus() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.getConnectionStatus();
    },

    async initiateAuth() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.initiateAuth();
    },

    async checkAuthStatus(sessionId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.checkAuthStatus(sessionId);
    },

    async disconnect() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.disconnect();
    },

    async getNotebooks() {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.getNotebooks();
    },

    async getNotebook(notebookId: string) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.getNotebook(notebookId);
    },

    async searchNotebooks(query: string, limit?: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.stravu.searchNotebooks(query, limit);
    },
  };

  // Dashboard
  static dashboard = {
    async getProjectStatus(projectId: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.dashboard.getProjectStatus(projectId);
    },

    async getProjectStatusProgressive(projectId: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.dashboard.getProjectStatusProgressive(projectId);
    },

    onUpdate(callback: (data: any) => void) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.dashboard.onUpdate(callback);
    },

    onSessionUpdate(callback: (data: any) => void) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.dashboard.onSessionUpdate(callback);
    },
  };

  // GitHub CLI integration
  static github = {
    async getPRs(projectId: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.github.getPRs(projectId);
    },

    async getIssues(projectId: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.github.getIssues(projectId);
    },

    async getCIStatus(projectId: number, prNumber: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.github.getCIStatus(projectId, prNumber);
    },

    async getCILogs(projectId: number, prNumber: number) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.github.getCILogs(projectId, prNumber);
    },

    async createFixSession(request: { projectId: number; prNumber: number; ciLogs?: string; type: 'pr' | 'issue' }) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.github.createFixSession(request);
    },

    async createPR(request: { projectId: number; title: string; body?: string }) {
      if (!isElectron()) throw new Error('Electron API not available');
      return window.electronAPI.github.createPR(request);
    },
  };
}

// Helper to call HTTP backend using same IPC channels
async function invokeHttp(channel: string, ...args: any[]) {
  const response = await fetch(`/ipc/${encodeURIComponent(channel)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  return response.json();
}

function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function createBrowserSection<T extends object>(section: string): T {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        return (...args: any[]) => invokeHttp(`${section}:${toKebabCase(String(prop))}`, ...args);
      },
    },
  ) as T;
}

class BrowserAPI {
  static sessions = createBrowserSection<any>('sessions');
  static projects = createBrowserSection<any>('projects');
  static folders = createBrowserSection<any>('folders');
  static config = createBrowserSection<any>('config');
  static prompts = createBrowserSection<any>('prompts');
  static dialog = createBrowserSection<any>('dialog');
  static permissions = createBrowserSection<any>('permissions');
  static stravu = createBrowserSection<any>('stravu');
  static dashboard = createBrowserSection<any>('dashboard');
  static github = createBrowserSection<any>('github');

  static checkForUpdates() {
    return invokeHttp('version:check-for-updates');
  }

  static getVersionInfo() {
    return invokeHttp('version:get-info');
  }
}

export { ElectronAPI, BrowserAPI };
export const API = isElectron() ? ElectronAPI : BrowserAPI;
