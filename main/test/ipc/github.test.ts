import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { registerGitHubHandlers } from '../../src/ipc/github';
import type { AppServices } from '../../src/ipc/types';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

describe('GitHub IPC Handlers', () => {
  let mockIpcMain: any;
  let mockServices: AppServices;
  let mockChildProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock IPC Main
    mockIpcMain = {
      handle: vi.fn()
    };

    // Mock services
    mockServices = {
      sessionManager: {
        createSession: vi.fn()
      },
      databaseService: {
        getProject: vi.fn()
      },
      claudeCodeManager: vi.fn(),
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        verbose: vi.fn()
      }
    } as any;

    // Mock child process
    mockChildProcess = new EventEmitter();
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    
    vi.mocked(spawn).mockReturnValue(mockChildProcess);

    // Register handlers
    registerGitHubHandlers(mockIpcMain, mockServices);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('github:get-prs', () => {
    it('should register handler', () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith('github:get-prs', expect.any(Function));
    });

    it('should execute gh pr list with correct arguments', async () => {
      const projectId = 1;
      const mockProject = { 
        id: 1, 
        path: '/test/project',
        name: 'Test Project',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(mockProject);

      // Get the handler function
      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:get-prs');
      const handler = handlerCall[1];

      // Start the handler
      const resultPromise = handler({}, projectId);

      // Verify spawn was called with correct arguments
      expect(vi.mocked(spawn)).toHaveBeenCalledWith('gh', [
        'pr', 'list',
        '--state', 'all',  // This is the key requirement from the user
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels,assignees,isDraft,mergeable,headRefName,baseRefName',
        '--limit', '50'
      ], {
        cwd: '/test/project',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Simulate successful command output
      const mockPRData = [{
        number: 123,
        title: 'Test PR',
        state: 'open',
        author: { login: 'testuser' },
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        url: 'https://github.com/test/repo/pull/123',
        labels: [],
        assignees: [],
        isDraft: false,
        mergeable: 'MERGEABLE',
        headRefName: 'feature-branch',
        baseRefName: 'main'
      }];

      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockPRData)));
      mockChildProcess.emit('close', 0);

      const result = await resultPromise;

      expect(result).toEqual({
        success: true,
        data: [{
          id: 'pr-123',
          number: 123,
          title: 'Test PR',
          state: 'open',
          author: 'testuser',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          url: 'https://github.com/test/repo/pull/123',
          labels: [],
          assignees: [],
          isDraft: false,
          mergeable: true,
          headBranch: 'feature-branch',
          baseBranch: 'main'
        }]
      });
    });

    it('should handle project not found', async () => {
      const projectId = 999;
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(undefined);

      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:get-prs');
      const handler = handlerCall[1];

      const result = await handler({}, projectId);

      expect(result).toEqual({
        success: false,
        error: 'Project not found'
      });
    });

    it('should handle gh command failure', async () => {
      const projectId = 1;
      const mockProject = { 
        id: 1, 
        path: '/test/project',
        name: 'Test Project',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(mockProject);

      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:get-prs');
      const handler = handlerCall[1];

      const resultPromise = handler({}, projectId);

      // Simulate command failure
      mockChildProcess.stderr.emit('data', Buffer.from('gh: command not found'));
      mockChildProcess.emit('close', 127);

      const result = await resultPromise;

      expect(result).toEqual({
        success: false,
        error: 'gh: command not found'
      });
    });
  });

  describe('github:get-issues', () => {
    it('should execute gh issue list with correct arguments', async () => {
      const projectId = 1;
      const mockProject = { 
        id: 1, 
        path: '/test/project',
        name: 'Test Project',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(mockProject);

      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:get-issues');
      const handler = handlerCall[1];

      const resultPromise = handler({}, projectId);

      // Verify spawn was called with correct arguments including --state all
      expect(vi.mocked(spawn)).toHaveBeenCalledWith('gh', [
        'issue', 'list',
        '--state', 'all',  // This is the key requirement from the user
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels,assignees',
        '--limit', '50'
      ], {
        cwd: '/test/project',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Simulate successful response
      mockChildProcess.stdout.emit('data', Buffer.from('[]'));
      mockChildProcess.emit('close', 0);

      await resultPromise;
    });
  });

  describe('github:get-ci-status', () => {
    it('should execute gh pr checks command', async () => {
      const projectId = 1;
      const prNumber = 123;
      const mockProject = { 
        id: 1, 
        path: '/test/project',
        name: 'Test Project',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(mockProject);

      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:get-ci-status');
      const handler = handlerCall[1];

      const resultPromise = handler({}, projectId, prNumber);

      // Verify spawn was called with correct arguments
      expect(vi.mocked(spawn)).toHaveBeenCalledWith('gh', [
        'pr', 'checks', '123',
        '--json', 'state,conclusion,name,detailsUrl'
      ], {
        cwd: '/test/project',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Simulate successful response
      const mockChecks = [{
        name: 'test-check',
        state: 'completed',
        conclusion: 'success',
        detailsUrl: 'https://github.com/test/repo/runs/456'
      }];

      mockChildProcess.stdout.emit('data', Buffer.from(JSON.stringify(mockChecks)));
      mockChildProcess.emit('close', 0);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('success');
      expect(result.data.checks).toHaveLength(1);
    });
  });

  describe('github:create-fix-session', () => {
    it('should create session for PR fix', async () => {
      const request = {
        type: 'pr' as const,
        projectId: 1,
        prNumber: 123,
        title: 'Fix failing tests',
        body: 'Tests are failing due to...',
        ciLogs: 'Error: test failed'
      };
      
      const mockProject = { 
        id: 1, 
        path: '/test/project',
        name: 'Test Project',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      const mockSession = { id: 'session-123' };
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(mockProject);
      vi.mocked(mockServices.sessionManager.createSession).mockReturnValue(mockSession as any);

      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:create-fix-session');
      const handler = handlerCall[1];

      const result = await handler({}, request);

      expect(result).toEqual({
        success: true,
        data: {
          sessionId: 'session-123',
          message: 'Created fix session for pr #123'
        }
      });

      expect(mockServices.sessionManager.createSession).toHaveBeenCalledWith(
        'Fix pr #123',
        '/test/project',
        expect.stringContaining('Fix CI failures for PR #123: Fix failing tests'),
        'fix-pr-123',
        'ignore',
        1,
        false,
        false,
        undefined,
        'claude-sonnet-4-20250514',
        undefined,
        'fix-pr-123',
        'structured'
      );
    });
  });

  describe('github:create-pr', () => {
    it('should execute gh pr create command', async () => {
      const projectId = 1;
      const title = 'Fix issue';
      const body = 'This fixes the issue';
      const mockProject = { 
        id: 1, 
        path: '/test/project',
        name: 'Test Project',
        active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      vi.mocked(mockServices.databaseService.getProject).mockReturnValue(mockProject);

      const handlerCall = mockIpcMain.handle.mock.calls.find((call: any) => call[0] === 'github:create-pr');
      const handler = handlerCall[1];

      const resultPromise = handler({}, projectId, title, body);

      // Verify spawn was called with correct arguments
      expect(vi.mocked(spawn)).toHaveBeenCalledWith('gh', [
        'pr', 'create',
        '--title', 'Fix issue',
        '--body', 'This fixes the issue'
      ], {
        cwd: '/test/project',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Simulate successful response
      mockChildProcess.stdout.emit('data', Buffer.from('https://github.com/test/repo/pull/124'));
      mockChildProcess.emit('close', 0);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toBe('https://github.com/test/repo/pull/124');
    });
  });
});