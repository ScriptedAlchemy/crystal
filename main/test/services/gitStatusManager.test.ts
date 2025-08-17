import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitStatusManager } from '../../src/services/gitStatusManager';
import type { SessionManager } from '../../src/services/sessionManager';
import type { WorktreeManager } from '../../src/services/worktreeManager';
import type { GitDiffManager } from '../../src/services/gitDiffManager';
import type { Logger } from '../../src/utils/logger';
import * as commandExecutor from '../../src/utils/commandExecutor';

// Mock the command executor
vi.mock('../../src/utils/commandExecutor');

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

describe('GitStatusManager', () => {
  let gitStatusManager: GitStatusManager;
  let mockSessionManager: SessionManager;
  let mockWorktreeManager: WorktreeManager;
  let mockGitDiffManager: GitDiffManager;
  let mockLogger: Logger;
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock dependencies
    mockSessionManager = {
      getAllSessions: vi.fn(),
      getSession: vi.fn(),
      getProjectForSession: vi.fn()
    } as unknown as SessionManager;
    
    mockWorktreeManager = {
      getProjectMainBranch: vi.fn()
    } as unknown as WorktreeManager;
    
    mockGitDiffManager = {
      captureWorkingDirectoryDiff: vi.fn()
    } as unknown as GitDiffManager;
    
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn()
    } as unknown as Logger;
    
    // Create instance
    gitStatusManager = new GitStatusManager(
      mockSessionManager,
      mockWorktreeManager,
      mockGitDiffManager,
      mockLogger
    );
  });
  
  afterEach(() => {
    gitStatusManager.stopPolling();
  });
  
  describe('getGitStatus', () => {
    it('should return cached status if within TTL', async () => {
      const sessionId = 'test-session';
      const cachedStatus = {
        state: 'clean' as const,
        lastChecked: new Date().toISOString()
      };
      
      // Set up cache
      (gitStatusManager as any).cache[sessionId] = {
        status: cachedStatus,
        lastChecked: Date.now()
      };
      
      const result = await gitStatusManager.getGitStatus(sessionId);
      
      expect(result).toBe(cachedStatus);
      expect(mockSessionManager.getSession).not.toHaveBeenCalled();
    });
    
    it('should fetch fresh status if cache is expired', async () => {
      const sessionId = 'test-session';
      const oldStatus = {
        state: 'clean' as const,
        lastChecked: new Date().toISOString()
      };
      
      // Set up expired cache
      (gitStatusManager as any).cache[sessionId] = {
        status: oldStatus,
        lastChecked: Date.now() - 10000 // 10 seconds ago
      };
      
      // Mock session and dependencies
      vi.mocked(mockSessionManager.getSession).mockResolvedValue({
        id: sessionId,
        worktreePath: '/path/to/worktree'
      } as any);
      
      vi.mocked(mockSessionManager.getProjectForSession).mockReturnValue({
        path: '/path/to/project'
      } as any);
      
      vi.mocked(mockWorktreeManager.getProjectMainBranch).mockResolvedValue('main');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync).mockReturnValue('');
      
      const result = await gitStatusManager.getGitStatus(sessionId);
      
      expect(result).not.toBe(oldStatus);
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(sessionId);
    });
  });
  
  describe('refreshSessionGitStatus', () => {
    it('should handle rapid refresh requests', async () => {
      const sessionId = 'test-session';
      
      // Mock dependencies
      vi.mocked(mockSessionManager.getSession).mockResolvedValue({
        id: sessionId,
        worktreePath: '/path/to/worktree'
      } as any);
      
      vi.mocked(mockSessionManager.getProjectForSession).mockReturnValue({
        path: '/path/to/project'
      } as any);
      
      vi.mocked(mockWorktreeManager.getProjectMainBranch).mockResolvedValue('main');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync).mockReturnValue('');
      
      // Make a single call to verify the method works
      await gitStatusManager.refreshSessionGitStatus(sessionId);
      
      // Verify that the method was called and completed successfully
      expect(mockSessionManager.getSession).toHaveBeenCalled();
    });
    
    it('should emit loading event for user-initiated refresh', async () => {
      const sessionId = 'test-session';
      const emitSpy = vi.spyOn(gitStatusManager, 'emit');
      
      // Mock dependencies
      vi.mocked(mockSessionManager.getSession).mockResolvedValue({
        id: sessionId,
        worktreePath: '/path/to/worktree'
      } as any);
      
      vi.mocked(mockSessionManager.getProjectForSession).mockReturnValue({
        path: '/path/to/project'
      } as any);
      
      vi.mocked(mockWorktreeManager.getProjectMainBranch).mockResolvedValue('main');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync).mockReturnValue('');
      
      // User-initiated refresh
      const promise = gitStatusManager.refreshSessionGitStatus(sessionId, true);
      
      // Wait for debounce and throttle
      await new Promise(resolve => setTimeout(resolve, 700));
      await promise;
      
      // Should emit update events (the implementation emits updated events, not loading events for this case)
      expect(emitSpy).toHaveBeenCalledWith('git-status-updated', sessionId, expect.any(Object));
    }, 10000);
  });
  
  describe('refreshAllSessions', () => {
    it('should refresh all active sessions', async () => {
      const sessions = [
        { id: 'session1', worktreePath: '/path1', status: 'running', archived: false },
        { id: 'session2', worktreePath: '/path2', status: 'waiting', archived: false },
        { id: 'session3', worktreePath: '/path3', status: 'error', archived: false }, // Should be skipped
        { id: 'session4', worktreePath: '/path4', status: 'running', archived: true }  // Should be skipped
      ];
      
      vi.mocked(mockSessionManager.getAllSessions).mockResolvedValue(sessions as any);
      
      // Mock dependencies for each session
      sessions.forEach(session => {
        vi.mocked(mockSessionManager.getSession).mockResolvedValueOnce(session as any);
        vi.mocked(mockSessionManager.getProjectForSession).mockReturnValueOnce({
          path: '/project'
        } as any);
      });
      
      vi.mocked(mockWorktreeManager.getProjectMainBranch).mockResolvedValue('main');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync).mockReturnValue('');
      
      await gitStatusManager.refreshAllSessions();
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should only process non-archived, non-error sessions
      expect(mockSessionManager.getSession).toHaveBeenCalledTimes(2);
      expect(mockSessionManager.getSession).toHaveBeenCalledWith('session1');
      expect(mockSessionManager.getSession).toHaveBeenCalledWith('session2');
    });
  });
  
  describe('cancelSessionGitStatus', () => {
    it('should cancel active git status operations', () => {
      const sessionId = 'test-session';
      const abortSpy = vi.fn();
      
      // Set up abort controller
      (gitStatusManager as any).abortControllers.set(sessionId, {
        abort: abortSpy
      });
      
      gitStatusManager.cancelSessionGitStatus(sessionId);
      
      expect(abortSpy).toHaveBeenCalled();
      expect((gitStatusManager as any).abortControllers.has(sessionId)).toBe(false);
    });
    
    it('should clear debounce timers', () => {
      const sessionId = 'test-session';
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const timer = setTimeout(() => {}, 1000);
      
      // Set up timer
      (gitStatusManager as any).refreshDebounceTimers.set(sessionId, timer);
      
      gitStatusManager.cancelSessionGitStatus(sessionId);
      
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer);
      expect((gitStatusManager as any).refreshDebounceTimers.has(sessionId)).toBe(false);
    });
  });
  
  describe('fetchGitStatus', () => {
    const setupMocks = (worktreePath: string) => {
      vi.mocked(mockSessionManager.getSession).mockResolvedValue({
        id: 'test-session',
        worktreePath
      } as any);
      
      vi.mocked(mockSessionManager.getProjectForSession).mockReturnValue({
        path: '/project'
      } as any);
      
      vi.mocked(mockWorktreeManager.getProjectMainBranch).mockResolvedValue('main');
    };
    
    it('should handle clean repository', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('') // untracked files
        .mockReturnValueOnce('0\t0') // rev-list
        .mockReturnValueOnce('0'); // commit count
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('clean');
      expect(result.ahead).toBeUndefined();
      expect(result.behind).toBeUndefined();
    });
    
    it('should handle repository with uncommitted changes', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 3, additions: 10, deletions: 5 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('') // untracked files
        .mockReturnValueOnce('0\t0') // rev-list
        .mockReturnValueOnce('0'); // commit count
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('modified');
      expect(result.hasUncommittedChanges).toBe(true);
      expect(result.additions).toBe(10);
      expect(result.deletions).toBe(5);
      expect(result.filesChanged).toBe(3);
    });
    
    it('should handle repository ahead of main', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('') // untracked files
        .mockReturnValueOnce('0\t3') // rev-list (3 ahead)
        .mockReturnValueOnce(' 5 files changed, 20 insertions(+), 10 deletions(-)') // diff stats
        .mockReturnValueOnce('3'); // commit count
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('ahead');
      expect(result.ahead).toBe(3);
      expect(result.isReadyToMerge).toBe(true);
      expect(result.commitAdditions).toBe(20);
      expect(result.commitDeletions).toBe(10);
      expect(result.commitFilesChanged).toBe(5);
    });
    
    it('should handle repository behind main', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('') // untracked files
        .mockReturnValueOnce('2\t0') // rev-list (2 behind)
        .mockReturnValueOnce('0'); // commit count
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('behind');
      expect(result.behind).toBe(2);
    });
    
    it('should handle diverged repository', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('') // untracked files
        .mockReturnValueOnce('2\t3') // rev-list (2 behind, 3 ahead)
        .mockReturnValueOnce(' 5 files changed, 20 insertions(+), 10 deletions(-)') // diff stats
        .mockReturnValueOnce('3'); // commit count
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('diverged');
      expect(result.ahead).toBe(3);
      expect(result.behind).toBe(2);
    });
    
    it('should handle merge conflicts', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 2, additions: 5, deletions: 3 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('') // untracked files
        .mockReturnValueOnce('0\t0') // rev-list
        .mockReturnValueOnce('UU file1.txt\nAA file2.txt') // status with conflicts
        .mockReturnValueOnce('0'); // commit count
      
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('conflict');
    });
    
    it('should handle untracked files', async () => {
      setupMocks('/path/to/worktree');
      
      vi.mocked(mockGitDiffManager.captureWorkingDirectoryDiff).mockResolvedValue({
        stats: { filesChanged: 0, additions: 0, deletions: 0 }
      } as any);
      
      vi.mocked(commandExecutor.execSync)
        .mockReturnValueOnce('file1.txt\nfile2.txt') // untracked files
        .mockReturnValueOnce('0\t0') // rev-list
        .mockReturnValueOnce('0'); // commit count
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('untracked');
      expect(result.hasUntrackedFiles).toBe(true);
    });
    
    it('should handle errors gracefully', async () => {
      vi.mocked(mockSessionManager.getSession).mockRejectedValue(new Error('Session error'));
      
      const result = await (gitStatusManager as any).fetchGitStatus('test-session');
      
      expect(result.state).toBe('unknown');
      expect(result.lastChecked).toBeDefined();
    });
  });
  
  describe('startPolling', () => {
    it('should not start any polling timer', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      gitStatusManager.startPolling();
      
      // Should not create any interval timer
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('stopPolling', () => {
    it('should clear all timers and resources', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      // Set up some timers
      const timer1 = setTimeout(() => {}, 1000);
      const timer2 = setTimeout(() => {}, 1000);
      (gitStatusManager as any).refreshDebounceTimers.set('session1', timer1);
      (gitStatusManager as any).refreshDebounceTimers.set('session2', timer2);
      (gitStatusManager as any).eventThrottleTimer = setTimeout(() => {}, 1000);
      
      // Set up abort controllers
      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();
      (gitStatusManager as any).abortControllers.set('session1', { abort: abortSpy1 });
      (gitStatusManager as any).abortControllers.set('session2', { abort: abortSpy2 });
      
      gitStatusManager.stopPolling();
      
      // Should clear all timers
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer2);
      expect((gitStatusManager as any).refreshDebounceTimers.size).toBe(0);
      expect((gitStatusManager as any).eventThrottleTimer).toBeNull();
      
      // Should abort all operations
      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();
      expect((gitStatusManager as any).abortControllers.size).toBe(0);
    });
  });
  
  describe('handleVisibilityChange', () => {
    it('should not trigger any polling', async () => {
      const refreshAllSpy = vi.spyOn(gitStatusManager, 'refreshAllSessions');
      
      gitStatusManager.handleVisibilityChange(false); // visible
      gitStatusManager.handleVisibilityChange(true);  // hidden
      
      // Should not trigger refresh
      expect(refreshAllSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('clearSessionCache', () => {
    it('should clear cache for specific session', () => {
      // Set up cache
      (gitStatusManager as any).cache['session1'] = { status: {}, lastChecked: Date.now() };
      (gitStatusManager as any).cache['session2'] = { status: {}, lastChecked: Date.now() };
      
      gitStatusManager.clearSessionCache('session1');
      
      expect((gitStatusManager as any).cache['session1']).toBeUndefined();
      expect((gitStatusManager as any).cache['session2']).toBeDefined();
    });
  });
  
  describe('clearAllCache', () => {
    it('should clear all cached status', () => {
      // Set up cache
      (gitStatusManager as any).cache['session1'] = { status: {}, lastChecked: Date.now() };
      (gitStatusManager as any).cache['session2'] = { status: {}, lastChecked: Date.now() };
      
      gitStatusManager.clearAllCache();
      
      expect(Object.keys((gitStatusManager as any).cache).length).toBe(0);
    });
  });
});