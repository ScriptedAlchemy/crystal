import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { app } from 'electron';

import { TaskQueue } from './services/taskQueue';
import { SessionManager } from './services/sessionManager';
import { ConfigManager } from './services/configManager';
import { WorktreeManager } from './services/worktreeManager';
import { WorktreeNameGenerator } from './services/worktreeNameGenerator';
import { GitDiffManager } from './services/gitDiffManager';
import { GitStatusManager } from './services/gitStatusManager';
import { ExecutionTracker } from './services/executionTracker';
import { DatabaseService } from './database/database';
import { RunCommandManager } from './services/runCommandManager';
import { PermissionIpcServer } from './services/permissionIpcServer';
import { VersionChecker } from './services/versionChecker';
import { StravuAuthManager } from './services/stravuAuthManager';
import { StravuNotebookService } from './services/stravuNotebookService';
import { ClaudeCodeManager } from './services/claudeCodeManager';
import { Logger } from './utils/logger';
import { setupEventListeners } from './events';
import { registerAppHandlers } from './ipc/app';
import { registerUpdaterHandlers } from './ipc/updater';
import { registerSessionHandlers } from './ipc/session';
import { registerProjectHandlers } from './ipc/project';
import { registerConfigHandlers } from './ipc/config';
import { registerDialogHandlers } from './ipc/dialog';
import { registerGitHandlers } from './ipc/git';
import { registerScriptHandlers } from './ipc/script';
import { registerPromptHandlers } from './ipc/prompt';
import { registerStravuHandlers } from './ipc/stravu';
import { registerFileHandlers } from './ipc/file';
import { registerFolderHandlers } from './ipc/folders';
import { registerUIStateHandlers } from './ipc/uiState';
import { registerDashboardHandlers } from './ipc/dashboard';
import { registerCommitModeHandlers } from './ipc/commitMode';
import type { AppServices } from './ipc/types';

class IpcServer {
  private handlers = new Map<string, (event: any, ...args: any[]) => any>();

  handle(channel: string, listener: (event: any, ...args: any[]) => any) {
    this.handlers.set(channel, listener);
  }

  async invoke(channel: string, ...args: any[]) {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`No handler registered for ${channel}`);
    return handler({}, ...args);
  }
}

async function initializeServices(): Promise<AppServices> {
  const configManager = new ConfigManager();
  await configManager.initialize();

  const logger = new Logger(configManager);

  const dbPath = configManager.getDatabasePath();
  const databaseService = new DatabaseService(dbPath);
  databaseService.initialize();

  const sessionManager = new SessionManager(databaseService);
  sessionManager.initializeFromDatabase();

  const permissionIpcServer = new PermissionIpcServer();
  let permissionIpcPath: string | null = null;
  try {
    await permissionIpcServer.start();
    permissionIpcPath = permissionIpcServer.getSocketPath();
  } catch (error) {
    console.error('[Server] Failed to start Permission IPC server:', error);
  }

  const worktreeManager = new WorktreeManager();
  const activeProject = sessionManager.getActiveProject();
  if (activeProject) {
    await worktreeManager.initializeProject(activeProject.path);
  }

  const claudeCodeManager = new ClaudeCodeManager(sessionManager, logger, configManager, permissionIpcPath);
  const gitDiffManager = new GitDiffManager();
  const gitStatusManager = new GitStatusManager(sessionManager, worktreeManager, gitDiffManager, logger);
  const executionTracker = new ExecutionTracker(sessionManager, gitDiffManager);
  const worktreeNameGenerator = new WorktreeNameGenerator(configManager);
  const runCommandManager = new RunCommandManager(databaseService);
  const versionChecker = new VersionChecker(configManager, logger);
  const stravuAuthManager = new StravuAuthManager(logger);
  const stravuNotebookService = new StravuNotebookService(stravuAuthManager, logger);

  const taskQueue = new TaskQueue({
    sessionManager,
    worktreeManager,
    claudeCodeManager,
    gitDiffManager,
    executionTracker,
    worktreeNameGenerator,
    getMainWindow: () => null,
  });

  const services: AppServices = {
    app,
    configManager,
    databaseService,
    sessionManager,
    worktreeManager,
    claudeCodeManager,
    gitDiffManager,
    gitStatusManager,
    executionTracker,
    worktreeNameGenerator,
    runCommandManager,
    versionChecker,
    stravuAuthManager,
    stravuNotebookService,
    taskQueue,
    getMainWindow: () => null,
    logger,
  };

  setupEventListeners(services, () => null);
  return services;
}

export function createHttpServer(ipc: IpcServer) {
  const server = express();
  server.use(cors());
  server.use(express.json());

  server.post('/ipc/:channel', async (req: Request, res: Response) => {
    const { channel } = req.params;
    const args = req.body?.args ?? [];
    try {
      const result = await ipc.invoke(channel, ...args);
      res.json(result);
    } catch (error) {
      console.error(`[HTTP] Error handling ${channel}:`, error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return server;
}

export async function startServer(port = process.env.PORT ? Number(process.env.PORT) : 3030) {
  await app.whenReady();
  const services = await initializeServices();

  const ipc = new IpcServer();
  registerAppHandlers(ipc as any, services);
  registerUpdaterHandlers(ipc as any, services);
  registerSessionHandlers(ipc as any, services);
  registerProjectHandlers(ipc as any, services);
  registerConfigHandlers(ipc as any, services);
  registerDialogHandlers(ipc as any, services);
  registerGitHandlers(ipc as any, services);
  registerScriptHandlers(ipc as any, services);
  registerPromptHandlers(ipc as any, services);
  registerStravuHandlers(ipc as any, services);
  registerFileHandlers(ipc as any, services);
  registerFolderHandlers(ipc as any, services);
  registerUIStateHandlers(services);
  registerDashboardHandlers(ipc as any, services);
  registerCommitModeHandlers(services.databaseService, services.logger, services.sessionManager);

  const server = createHttpServer(ipc);
  return server.listen(port, () => {
    console.log(`[HTTP] API server listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start HTTP server:', err);
  });
}
