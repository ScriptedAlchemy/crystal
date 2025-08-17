import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import type { AppServices } from '../../ipc/types';
import { registerGitHubHandlers } from '../../ipc/github';
import type { GitHubPR, GitHubIssue, GitHubCIStatus } from '../../../../shared/types';

// Mock child_process
vi.mock('child_process');

// Mock process class for testing
class MockProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  
  constructor(private exitCode: number = 0, private stdoutData: string = '', private stderrData: string = '') {
    super();
  }
  
  simulateExecution() {
    setTimeout(() => {
      if (this.stdoutData) {
        this.stdout.emit('data', Buffer.from(this.stdoutData));
      }
      if (this.stderrData) {
        this.stderr.emit('data', Buffer.from(this.stderrData));
      }
      this.emit('close', this.exitCode);
    }, 10);
  }
}

describe('GitHub IPC Handlers', () => {
  let mockIpcMain: any;
  let mockServices: AppServices;
  let mockSpawn: any;
  
  const mockProject = {
    id: 1,
    name: 'test-project',
    path: '/path/to/test-project'
  };
  
  const mockPRData = [
    {
      number: 123,
      title: 'Fix authentication bug',
      state: 'open',
      author: { login: 'developer1' },
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      url: 'https://github.com/test/repo/pull/123',
      labels: [{ name: 'bug' }],
      assignees: [],
      isDraft: false,
      mergeable: 'MERGEABLE',
      headRefName: 'fix/auth-bug',
      baseRefName: 'main'
    }
  ];
  
  const mockIssueData = [
    {
      number: 456,
      title: 'Add dark mode support',
      state: 'open',
      author: { login: 'designer1' },
      createdAt: '2024-01-14T15:20:00Z',
      updatedAt: '2024-01-14T15:20:00Z',
      url: 'https://github.com/test/repo/issues/456',
      labels: [{ name: 'enhancement' }],
      assignees: [{ login: 'developer2' }]
    }
  ];
  
  const mockCIData = [
    {
      name: 'CI / build',
      state: 'completed',
      conclusion: 'success',
      detailsUrl: 'https://github.com/test/repo/actions/runs/123'
    }
  ];
  
  beforeEach(() => {
    // Mock IPC Main
    mockIpcMain = {
      handle: vi.fn()
    };
    
    // Mock services
    mockServices = {
      sessionManager: {
        createSession: vi.fn().mockResolvedValue({ success: true, sessionId: 'test-session-id' })
      },
      databaseService: {
        getProject: vi.fn().mockReturnValue(mockProject)
      },
      claudeCodeManager: {},
      logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn()
      }
    } as any;
    
    // Mock spawn
    mockSpawn = vi.mocked(spawn);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('github:get-prs', () => {
    it('should fetch PRs successfully', async () => {
      const mockProcess = new MockProcess(0, JSON.stringify(mockPRData));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      // Get the handler function
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-prs'
      );
      expect(handleCall).toBeDefined();
      
      const handler = handleCall[1];
      
      // Execute the handler
      const resultPromise = handler({}, 1);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        number: 123,
        title: 'Fix authentication bug',
        state: 'open',
        author: 'developer1',
        headBranch: 'fix/auth-bug',
        baseBranch: 'main'
      });
      
      expect(mockSpawn).toHaveBeenCalledWith('gh', [
        'pr', 'list',
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels,assignees,isDraft,mergeable,headRefName,baseRefName',
        '--limit', '50'
      ], { cwd: mockProject.path, stdio: ['pipe', 'pipe', 'pipe'] });
    });
    
    it('should handle project not found', async () => {
      mockServices.databaseService.getProject = vi.fn().mockReturnValue(null);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-prs'
      );
      const handler = handleCall[1];
      
      const result = await handler({}, 999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found');
    });
    
    it('should handle GitHub CLI errors', async () => {
      const mockProcess = new MockProcess(1, '', 'GitHub CLI authentication failed');
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-prs'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('GitHub CLI authentication failed');
      expect(mockServices.logger?.error).toHaveBeenCalled();
    });
  });
  
  describe('github:get-issues', () => {
    it('should fetch issues successfully', async () => {
      const mockProcess = new MockProcess(0, JSON.stringify(mockIssueData));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-issues'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        number: 456,
        title: 'Add dark mode support',
        state: 'open',
        author: 'designer1',
        assignees: ['developer2']
      });
      
      expect(mockSpawn).toHaveBeenCalledWith('gh', [
        'issue', 'list',
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels,assignees',
        '--limit', '50'
      ], { cwd: mockProject.path, stdio: ['pipe', 'pipe', 'pipe'] });
    });
  });
  
  describe('github:get-ci-status', () => {
    it('should fetch CI status successfully', async () => {
      const mockProcess = new MockProcess(0, JSON.stringify(mockCIData));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-ci-status'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1, 123);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        status: 'success',
        checkRuns: [
          {
            name: 'CI / build',
            status: 'completed',
            conclusion: 'success',
            url: 'https://github.com/test/repo/actions/runs/123'
          }
        ]
      });
      
      expect(mockSpawn).toHaveBeenCalledWith('gh', [
        'pr', 'checks', '123',
        '--json', 'state,conclusion,name,detailsUrl'
      ], { cwd: mockProject.path, stdio: ['pipe', 'pipe', 'pipe'] });
    });
    
    it('should handle failed CI status', async () => {
      const failedCIData = [
        {
          name: 'CI / build',
          state: 'completed',
          conclusion: 'failure',
          detailsUrl: 'https://github.com/test/repo/actions/runs/124'
        }
      ];
      
      const mockProcess = new MockProcess(0, JSON.stringify(failedCIData));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-ci-status'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1, 123);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('failure');
    });
  });
  
  describe('github:get-ci-logs', () => {
    it('should fetch CI logs for failed checks', async () => {
      const failedChecks = [
        {
          name: 'CI / test',
          state: 'completed',
          conclusion: 'failure',
          detailsUrl: 'https://github.com/test/repo/actions/runs/125'
        }
      ];
      
      const mockProcess = new MockProcess(0, JSON.stringify(failedChecks));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-ci-logs'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1, 123);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('❌ CI / test: failure');
      expect(result.data).toContain('https://github.com/test/repo/actions/runs/125');
    });
    
    it('should handle no failed checks', async () => {
      const successfulChecks = [
        {
          name: 'CI / test',
          state: 'completed',
          conclusion: 'success',
          detailsUrl: 'https://github.com/test/repo/actions/runs/126'
        }
      ];
      
      const mockProcess = new MockProcess(0, JSON.stringify(successfulChecks));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:get-ci-logs'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1, 123);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('No failed CI checks found.');
    });
  });
  
  describe('github:create-fix-session', () => {
    it('should create PR fix session successfully', async () => {
      const prDetails = {
        title: 'Fix authentication bug',
        body: 'This PR fixes the authentication issue',
        headRefName: 'fix/auth-bug'
      };
      
      const mockProcess = new MockProcess(0, JSON.stringify(prDetails));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:create-fix-session'
      );
      const handler = handleCall[1];
      
      const request = {
        projectId: 1,
        prNumber: 123,
        type: 'pr' as const,
        ciLogs: 'Test failed: authentication error'
      };
      
      const resultPromise = handler({}, request);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('test-session-id');
      expect(result.data.message).toContain('Created fix session for pr #123');
      
      expect(mockServices.sessionManager.createSession).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Fix CI failures for PR #123'),
        projectId: 1,
        baseBranch: 'fix/auth-bug',
        autoCommit: false,
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'ignore',
        commitMode: 'structured'
      });
    });
    
    it('should create issue investigation session successfully', async () => {
      const issueDetails = {
        title: 'Add dark mode support',
        body: 'We need to implement dark mode for better UX'
      };
      
      const mockProcess = new MockProcess(0, JSON.stringify(issueDetails));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:create-fix-session'
      );
      const handler = handleCall[1];
      
      const request = {
        projectId: 1,
        prNumber: 456,
        type: 'issue' as const
      };
      
      const resultPromise = handler({}, request);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('test-session-id');
      expect(result.data.message).toContain('Created fix session for issue #456');
      
      expect(mockServices.sessionManager.createSession).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Investigate and fix issue #456'),
        projectId: 1,
        baseBranch: 'fix-issue-456',
        autoCommit: false,
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'ignore',
        commitMode: 'structured'
      });
    });
    
    it('should handle session creation failure', async () => {
      mockServices.sessionManager.createSession = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create session'
      });
      
      const prDetails = {
        title: 'Fix authentication bug',
        body: 'This PR fixes the authentication issue',
        headRefName: 'fix/auth-bug'
      };
      
      const mockProcess = new MockProcess(0, JSON.stringify(prDetails));
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:create-fix-session'
      );
      const handler = handleCall[1];
      
      const request = {
        projectId: 1,
        prNumber: 123,
        type: 'pr' as const
      };
      
      const resultPromise = handler({}, request);
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create session');
    });
  });
  
  describe('github:create-pr', () => {
    it('should create PR successfully', async () => {
      const mockProcess = new MockProcess(0, 'https://github.com/test/repo/pull/789');
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:create-pr'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1, 'Add new feature', 'This PR adds a new feature');
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('https://github.com/test/repo/pull/789');
      
      expect(mockSpawn).toHaveBeenCalledWith('gh', [
        'pr', 'create',
        '--title', 'Add new feature',
        '--body', 'This PR adds a new feature'
      ], { cwd: mockProject.path, stdio: ['pipe', 'pipe', 'pipe'] });
    });
    
    it('should create PR without body', async () => {
      const mockProcess = new MockProcess(0, 'https://github.com/test/repo/pull/790');
      mockSpawn.mockReturnValue(mockProcess as any);
      
      registerGitHubHandlers(mockIpcMain, mockServices);
      
      const handleCall = mockIpcMain.handle.mock.calls.find(
        (call: any) => call[0] === 'github:create-pr'
      );
      const handler = handleCall[1];
      
      const resultPromise = handler({}, 1, 'Add new feature');
      mockProcess.simulateExecution();
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('gh', [
        'pr', 'create',
        '--title', 'Add new feature'
      ], { cwd: mockProject.path, stdio: ['pipe', 'pipe', 'pipe'] });
    });
  });
});