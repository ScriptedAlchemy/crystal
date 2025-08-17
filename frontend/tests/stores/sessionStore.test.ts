import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSessionStore } from '../../src/stores/sessionStore';
import { API } from '../../src/utils/api';
import type { Session, SessionOutput, GitStatus } from '../../src/types/session';

// Mock API
vi.mock('../../src/utils/api', () => ({
  API: {
    sessions: {
      create: vi.fn(),
      get: vi.fn(),
      markViewed: vi.fn(),
    }
  }
}));

// Mock console.log and console.warn to reduce noise
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Helper to create mock sessions
const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-123',
  name: 'Test Session',
  worktreePath: '/path/to/worktree',
  prompt: 'Test prompt',
  status: 'ready',
  createdAt: '2024-01-15T10:30:00Z',
  output: [],
  jsonMessages: [],
  projectId: 1,
  isMainRepo: false,
  model: 'claude-3-5-sonnet-20241022',
  ...overrides,
});

const createMockMainRepoSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'main-repo-session',
  name: 'Main Repository',
  worktreePath: '/path/to/main',
  prompt: 'Main repo session',
  status: 'ready',
  createdAt: '2024-01-15T09:00:00Z',
  output: [],
  jsonMessages: [],
  projectId: 1,
  isMainRepo: true,
  model: 'claude-3-5-sonnet-20241022',
  ...overrides,
});

const createMockGitStatus = (overrides: Partial<GitStatus> = {}): GitStatus => ({
  state: 'clean',
  ahead: 0,
  behind: 0,
  additions: 0,
  deletions: 0,
  filesChanged: 0,
  isReadyToMerge: true,
  hasUncommittedChanges: false,
  hasUntrackedFiles: false,
  ...overrides,
});

const createMockSessionOutput = (overrides: Partial<SessionOutput> = {}): SessionOutput => ({
  sessionId: 'session-123',
  type: 'stdout',
  data: 'Test output',
  timestamp: '2024-01-15T10:30:00Z',
  ...overrides,
});

describe('SessionStore', () => {
  beforeEach(() => {
    // Clean up any pending timers from previous tests
    const currentState = useSessionStore.getState();
    if (currentState.gitStatusBatchTimer) {
      clearTimeout(currentState.gitStatusBatchTimer);
    }
    
    // Reset store state before each test
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      activeMainRepoSession: null,
      isLoaded: false,
      terminalOutput: {},
      deletingSessionIds: new Set(),
      gitStatusLoading: new Set(),
      gitStatusBatchTimer: null,
      pendingGitStatusLoading: new Map(),
      pendingGitStatusUpdates: new Map(),
    });
    
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
  });

  afterEach(() => {
    // Clean up any pending timers
    const state = useSessionStore.getState();
    if (state.gitStatusBatchTimer) {
      clearTimeout(state.gitStatusBatchTimer);
    }
    vi.clearAllTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSessionStore());
      
      expect(result.current.sessions).toEqual([]);
      expect(result.current.activeSessionId).toBeNull();
      expect(result.current.activeMainRepoSession).toBeNull();
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.terminalOutput).toEqual({});
      expect(result.current.deletingSessionIds).toEqual(new Set());
      expect(result.current.gitStatusLoading).toEqual(new Set());
      expect(result.current.gitStatusBatchTimer).toBeNull();
      expect(result.current.pendingGitStatusLoading).toEqual(new Map());
      expect(result.current.pendingGitStatusUpdates).toEqual(new Map());
    });
  });

  describe('setSessions', () => {
    it('should set sessions array', () => {
      const { result } = renderHook(() => useSessionStore());
      const sessions = [createMockSession(), createMockSession({ id: 'session-456' })];
      
      act(() => {
        result.current.setSessions(sessions);
      });
      
      expect(result.current.sessions).toEqual(sessions);
    });
  });

  describe('loadSessions', () => {
    it('should load sessions and set loaded flag', () => {
      const { result } = renderHook(() => useSessionStore());
      const sessions = [createMockSession()];
      
      act(() => {
        result.current.loadSessions(sessions);
      });
      
      expect(result.current.sessions).toEqual(sessions);
      expect(result.current.isLoaded).toBe(true);
    });
  });

  describe('addSession', () => {
    it('should add new session to top and set as active', () => {
      const { result } = renderHook(() => useSessionStore());
      const existingSession = createMockSession({ id: 'existing' });
      const newSession = createMockSession({ id: 'new-session' });
      
      // Add existing session first
      act(() => {
        result.current.setSessions([existingSession]);
      });
      
      act(() => {
        result.current.addSession(newSession);
      });
      
      expect(result.current.sessions).toEqual([
        { ...newSession, output: [], jsonMessages: [] },
        existingSession
      ]);
      expect(result.current.activeSessionId).toBe('new-session');
    });

    it('should initialize arrays for new session', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession({ output: undefined as any, jsonMessages: undefined as any });
      
      act(() => {
        result.current.addSession(session);
      });
      
      expect(result.current.sessions[0].output).toEqual([]);
      expect(result.current.sessions[0].jsonMessages).toEqual([]);
    });
  });

  describe('updateSession', () => {
    it('should update regular session in sessions array', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      
      act(() => {
        result.current.setSessions([session]);
      });
      
      const updatedSession = { ...session, name: 'Updated Name', status: 'running' as const };
      
      act(() => {
        result.current.updateSession(updatedSession);
      });
      
      expect(result.current.sessions[0].name).toBe('Updated Name');
      expect(result.current.sessions[0].status).toBe('running');
      expect(result.current.sessions[0].output).toEqual(session.output);
      expect(result.current.sessions[0].jsonMessages).toEqual(session.jsonMessages);
    });

    it('should update main repo session when active', () => {
      const { result } = renderHook(() => useSessionStore());
      const mainSession = createMockMainRepoSession();
      
      act(() => {
        result.current.setSessions([mainSession]);
        useSessionStore.setState({ activeMainRepoSession: mainSession });
      });
      
      const updatedSession = { ...mainSession, name: 'Updated Main Session' };
      
      act(() => {
        result.current.updateSession(updatedSession);
      });
      
      expect(result.current.activeMainRepoSession?.name).toBe('Updated Main Session');
    });

    it('should preserve output when updating session', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession({ 
        output: ['existing output'],
        jsonMessages: [{ type: 'tool_use', content: 'test' }]
      });
      
      act(() => {
        result.current.setSessions([session]);
      });
      
      const updatedSession = { ...session, status: 'completed_unviewed' as const };
      
      act(() => {
        result.current.updateSession(updatedSession);
      });
      
      expect(result.current.sessions[0].status).toBe('completed_unviewed');
      expect(result.current.sessions[0].output).toEqual(['existing output']);
      expect(result.current.sessions[0].jsonMessages).toEqual([{ type: 'tool_use', content: 'test' }]);
    });
  });

  describe('deleteSession', () => {
    it('should remove session from sessions array', () => {
      const { result } = renderHook(() => useSessionStore());
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      
      act(() => {
        result.current.setSessions([session1, session2]);
      });
      
      act(() => {
        result.current.deleteSession(session1);
      });
      
      expect(result.current.sessions).toEqual([session2]);
    });

    it('should clear active session if deleted', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      
      act(() => {
        result.current.setSessions([session]);
        useSessionStore.setState({ activeSessionId: session.id });
      });
      
      act(() => {
        result.current.deleteSession(session);
      });
      
      expect(result.current.activeSessionId).toBeNull();
    });

    it('should clear active main repo session if deleted', () => {
      const { result } = renderHook(() => useSessionStore());
      const mainSession = createMockMainRepoSession();
      
      act(() => {
        result.current.setSessions([mainSession]);
        useSessionStore.setState({ activeMainRepoSession: mainSession });
      });
      
      act(() => {
        result.current.deleteSession(mainSession);
      });
      
      expect(result.current.activeMainRepoSession).toBeNull();
    });
  });

  describe('setActiveSession', () => {
    it('should clear active session when sessionId is null', async () => {
      const { result } = renderHook(() => useSessionStore());
      
      await act(async () => {
        await result.current.setActiveSession(null);
      });
      
      expect(result.current.activeSessionId).toBeNull();
      expect(result.current.activeMainRepoSession).toBeNull();
    });

    it('should set existing regular session as active', async () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      act(() => {
        result.current.setSessions([session]);
      });
      
      await act(async () => {
        await result.current.setActiveSession(session.id);
      });
      
      expect(result.current.activeSessionId).toBe(session.id);
      expect(result.current.activeMainRepoSession).toBeNull();
      expect(API.sessions.markViewed).toHaveBeenCalledWith(session.id);
    });

    it('should set existing main repo session as active', async () => {
      const { result } = renderHook(() => useSessionStore());
      const mainSession = createMockMainRepoSession();
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      act(() => {
        result.current.setSessions([mainSession]);
      });
      
      await act(async () => {
        await result.current.setActiveSession(mainSession.id);
      });
      
      expect(result.current.activeSessionId).toBe(mainSession.id);
      expect(result.current.activeMainRepoSession).toEqual({
        ...mainSession,
        output: [],
        jsonMessages: []
      });
      expect(API.sessions.markViewed).toHaveBeenCalledWith(mainSession.id);
    });

    it('should not mark already active session as viewed', async () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      act(() => {
        result.current.setSessions([session]);
        useSessionStore.setState({ activeSessionId: session.id });
      });
      
      await act(async () => {
        await result.current.setActiveSession(session.id);
      });
      
      expect(API.sessions.markViewed).not.toHaveBeenCalled();
    });

    it('should fetch session from backend if not in local store', async () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      
      vi.mocked(API.sessions.get).mockResolvedValue({ success: true, data: session });
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      await act(async () => {
        await result.current.setActiveSession(session.id);
      });
      
      expect(API.sessions.get).toHaveBeenCalledWith(session.id);
      expect(result.current.sessions).toContainEqual({
        ...session,
        output: [],
        jsonMessages: []
      });
      expect(result.current.activeSessionId).toBe(session.id);
    });

    it('should handle backend fetch failure gracefully', async () => {
      const { result } = renderHook(() => useSessionStore());
      
      vi.mocked(API.sessions.get).mockResolvedValue({ success: false, error: 'Session not found' });
      
      await act(async () => {
        await result.current.setActiveSession('non-existent');
      });
      
      // When backend fetch fails, activeSessionId should remain null
      expect(result.current.activeSessionId).toBeNull();
      expect(result.current.activeMainRepoSession).toBeNull();
      expect(result.current.sessions).toEqual([]); // Sessions array should remain unchanged
    });
  });

  describe('Session Output Management', () => {
    describe('addSessionOutput', () => {
      it('should add stdout output to session', () => {
        const { result } = renderHook(() => useSessionStore());
        const session = createMockSession({ output: ['existing'] });
        const output = createMockSessionOutput({ type: 'stdout', data: 'new output' });
        
        act(() => {
          result.current.setSessions([session]);
        });
        
        act(() => {
          result.current.addSessionOutput(output);
        });
        
        expect(result.current.sessions[0].output).toEqual(['existing', 'new output']);
      });

      it('should add JSON message to session', () => {
        const { result } = renderHook(() => useSessionStore());
        const session = createMockSession({ jsonMessages: [] });
        const output = createMockSessionOutput({ 
          type: 'json', 
          data: { type: 'tool_use', name: 'bash', content: 'ls' }
        });
        
        act(() => {
          result.current.setSessions([session]);
        });
        
        act(() => {
          result.current.addSessionOutput(output);
        });
        
        expect(result.current.sessions[0].jsonMessages).toEqual([{
          type: 'tool_use',
          name: 'bash',
          content: 'ls',
          timestamp: output.timestamp
        }]);
      });

      it('should update activeMainRepoSession when output matches', () => {
        const { result } = renderHook(() => useSessionStore());
        const mainSession = createMockMainRepoSession({ output: ['existing'] });
        const output = createMockSessionOutput({ 
          sessionId: mainSession.id,
          type: 'stdout',
          data: 'main repo output'
        });
        
        act(() => {
          result.current.setSessions([mainSession]);
          useSessionStore.setState({ activeMainRepoSession: mainSession });
        });
        
        act(() => {
          result.current.addSessionOutput(output);
        });
        
        expect(result.current.activeMainRepoSession?.output).toEqual(['existing', 'main repo output']);
      });

      it('should handle non-existent session gracefully', () => {
        const { result } = renderHook(() => useSessionStore());
        const output = createMockSessionOutput({ sessionId: 'non-existent' });
        
        act(() => {
          result.current.addSessionOutput(output);
        });
        
        // Should not crash, just log warning
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('[SessionStore] Session non-existent not found in store, cannot add output')
        );
      });
    });

    describe('setSessionOutputs', () => {
      it('should set mixed outputs and JSON messages', () => {
        const { result } = renderHook(() => useSessionStore());
        const session = createMockSession();
        
        const outputs: SessionOutput[] = [
          createMockSessionOutput({ type: 'stdout', data: 'output 1' }),
          createMockSessionOutput({ type: 'json', data: { type: 'tool_use', name: 'bash' } }),
          createMockSessionOutput({ type: 'stderr', data: 'error output' }),
        ];
        
        act(() => {
          result.current.setSessions([session]);
        });
        
        act(() => {
          result.current.setSessionOutputs(session.id, outputs);
        });
        
        expect(result.current.sessions[0].output).toEqual(['output 1', 'error output']);
        expect(result.current.sessions[0].jsonMessages).toEqual([{
          type: 'tool_use',
          name: 'bash',
          timestamp: outputs[1].timestamp
        }]);
      });

      it('should update activeMainRepoSession when setting outputs', () => {
        const { result } = renderHook(() => useSessionStore());
        const mainSession = createMockMainRepoSession();
        
        const outputs: SessionOutput[] = [
          createMockSessionOutput({ sessionId: mainSession.id, type: 'stdout', data: 'main output' }),
        ];
        
        act(() => {
          result.current.setSessions([mainSession]);
          useSessionStore.setState({ activeMainRepoSession: mainSession });
        });
        
        act(() => {
          result.current.setSessionOutputs(mainSession.id, outputs);
        });
        
        expect(result.current.activeMainRepoSession?.output).toEqual(['main output']);
      });
    });

    describe('clearSessionOutput', () => {
      it('should clear session output and JSON messages', () => {
        const { result } = renderHook(() => useSessionStore());
        const session = createMockSession({ 
          output: ['output1', 'output2'],
          jsonMessages: [{ type: 'tool_use' }]
        });
        
        act(() => {
          result.current.setSessions([session]);
        });
        
        act(() => {
          result.current.clearSessionOutput(session.id);
        });
        
        expect(result.current.sessions[0].output).toEqual([]);
        expect(result.current.sessions[0].jsonMessages).toEqual([]);
      });
    });
  });

  describe('Terminal Output Management', () => {
    it('should add terminal output', () => {
      const { result } = renderHook(() => useSessionStore());
      
      act(() => {
        result.current.addTerminalOutput({
          sessionId: 'session-123',
          type: 'stdout',
          data: 'terminal output'
        });
      });
      
      expect(result.current.terminalOutput['session-123']).toEqual(['terminal output']);
    });

    it('should append to existing terminal output', () => {
      const { result } = renderHook(() => useSessionStore());
      
      act(() => {
        result.current.addTerminalOutput({
          sessionId: 'session-123',
          type: 'stdout',
          data: 'first line'
        });
      });
      
      act(() => {
        result.current.addTerminalOutput({
          sessionId: 'session-123',
          type: 'stderr',
          data: 'second line'
        });
      });
      
      expect(result.current.terminalOutput['session-123']).toEqual(['first line', 'second line']);
    });

    it('should clear terminal output', () => {
      const { result } = renderHook(() => useSessionStore());
      
      act(() => {
        result.current.addTerminalOutput({
          sessionId: 'session-123',
          type: 'stdout',
          data: 'output to clear'
        });
      });
      
      act(() => {
        result.current.clearTerminalOutput('session-123');
      });
      
      expect(result.current.terminalOutput['session-123']).toEqual([]);
    });

    it('should get terminal output', () => {
      const { result } = renderHook(() => useSessionStore());
      
      act(() => {
        result.current.addTerminalOutput({
          sessionId: 'session-123',
          type: 'stdout',
          data: 'test output'
        });
      });
      
      const output = result.current.getTerminalOutput('session-123');
      expect(output).toEqual(['test output']);
    });

    it('should return empty array for non-existent session', () => {
      const { result } = renderHook(() => useSessionStore());
      
      const output = result.current.getTerminalOutput('non-existent');
      expect(output).toEqual([]);
    });
  });

  describe('Session Creation', () => {
    it('should create session successfully', async () => {
      const { result } = renderHook(() => useSessionStore());
      
      vi.mocked(API.sessions.create).mockResolvedValue({ success: true });
      
      const request = {
        prompt: 'Test prompt',
        worktreeTemplate: 'feature-test',
        count: 1
      };
      
      await act(async () => {
        await result.current.createSession(request);
      });
      
      expect(API.sessions.create).toHaveBeenCalledWith(request);
    });

    it('should handle session creation failure', async () => {
      const { result } = renderHook(() => useSessionStore());
      
      vi.mocked(API.sessions.create).mockResolvedValue({ 
        success: false, 
        error: 'Creation failed' 
      });
      
      const request = {
        prompt: 'Test prompt',
        worktreeTemplate: 'feature-test',
        count: 1
      };
      
      await expect(
        act(async () => {
          await result.current.createSession(request);
        })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('Deletion Management', () => {
    it('should manage deleting session IDs', () => {
      const { result } = renderHook(() => useSessionStore());
      
      act(() => {
        result.current.setDeletingSessionIds(['session-1', 'session-2']);
      });
      
      expect(result.current.deletingSessionIds).toEqual(new Set(['session-1', 'session-2']));
      
      act(() => {
        result.current.addDeletingSessionId('session-3');
      });
      
      expect(result.current.deletingSessionIds).toEqual(new Set(['session-1', 'session-2', 'session-3']));
      
      act(() => {
        result.current.removeDeletingSessionId('session-1');
      });
      
      expect(result.current.deletingSessionIds).toEqual(new Set(['session-2', 'session-3']));
      
      act(() => {
        result.current.clearDeletingSessionIds();
      });
      
      expect(result.current.deletingSessionIds).toEqual(new Set());
    });
  });

  describe('Git Status Management', () => {
    it('should manage git status loading state', () => {
      const { result } = renderHook(() => useSessionStore());
      
      vi.useFakeTimers();
      
      expect(result.current.isGitStatusLoading('session-123')).toBe(false);
      
      act(() => {
        result.current.setGitStatusLoading('session-123', true);
      });
      
      // Advance timers to process pending updates
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      expect(result.current.isGitStatusLoading('session-123')).toBe(true);
      
      act(() => {
        result.current.setGitStatusLoading('session-123', false);
      });
      
      // Advance timers to process pending updates
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      expect(result.current.isGitStatusLoading('session-123')).toBe(false);
      
      vi.useRealTimers();
    });

    it('should batch git status loading updates', () => {
      const { result } = renderHook(() => useSessionStore());
      
      const updates = [
        { sessionId: 'session-1', loading: true },
        { sessionId: 'session-2', loading: true },
        { sessionId: 'session-3', loading: false },
      ];
      
      act(() => {
        result.current.setGitStatusLoadingBatch(updates);
      });
      
      expect(result.current.isGitStatusLoading('session-1')).toBe(true);
      expect(result.current.isGitStatusLoading('session-2')).toBe(true);
      expect(result.current.isGitStatusLoading('session-3')).toBe(false);
    });

    it('should batch git status updates', () => {
      const { result } = renderHook(() => useSessionStore());
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      
      act(() => {
        result.current.setSessions([session1, session2]);
      });
      
      const gitStatus1 = createMockGitStatus({ state: 'modified', filesChanged: 3 });
      const gitStatus2 = createMockGitStatus({ state: 'ahead', ahead: 2 });
      
      const updates = [
        { sessionId: 'session-1', status: gitStatus1 },
        { sessionId: 'session-2', status: gitStatus2 },
      ];
      
      act(() => {
        result.current.updateSessionGitStatusBatch(updates);
      });
      
      expect(result.current.sessions[0].gitStatus).toEqual(gitStatus1);
      expect(result.current.sessions[1].gitStatus).toEqual(gitStatus2);
    });

    it('should update main repo session git status', () => {
      const { result } = renderHook(() => useSessionStore());
      const mainSession = createMockMainRepoSession();
      
      act(() => {
        result.current.setSessions([mainSession]);
        useSessionStore.setState({ activeMainRepoSession: mainSession });
      });
      
      const newGitStatus = createMockGitStatus({ state: 'modified', filesChanged: 2 });
      
      const updates = [
        { sessionId: mainSession.id, status: newGitStatus },
      ];
      
      act(() => {
        result.current.updateSessionGitStatusBatch(updates);
      });
      
      expect(result.current.activeMainRepoSession?.gitStatus).toEqual(newGitStatus);
    });
  });

  describe('Git Status Batching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should batch git status updates with timer', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      const gitStatus = createMockGitStatus({ state: 'modified' });
      
      act(() => {
        result.current.setSessions([session]);
      });
      
      // Verify initial state
      expect(result.current.sessions[0].gitStatus).toBeUndefined();
      expect(result.current.pendingGitStatusUpdates.size).toBe(0);
      
      // Should not update immediately
      act(() => {
        result.current.updateSessionGitStatus(session.id, gitStatus);
      });
      
      expect(result.current.sessions[0].gitStatus).toBeUndefined();
      expect(result.current.pendingGitStatusUpdates.size).toBe(1);
      
      // Should update after timer fires
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      expect(result.current.sessions[0].gitStatus).toEqual(gitStatus);
      expect(result.current.pendingGitStatusUpdates.size).toBe(0);
    });

    it('should batch multiple git status updates', () => {
      const { result } = renderHook(() => useSessionStore());
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      
      act(() => {
        result.current.setSessions([session1, session2]);
      });
      
      const gitStatus1 = createMockGitStatus({ state: 'modified' });
      const gitStatus2 = createMockGitStatus({ state: 'ahead' });
      
      // Add multiple updates
      act(() => {
        result.current.updateSessionGitStatus('session-1', gitStatus1);
        result.current.updateSessionGitStatus('session-2', gitStatus2);
      });
      
      // Should not update immediately
      expect(result.current.sessions[0].gitStatus).toBeUndefined();
      expect(result.current.sessions[1].gitStatus).toBeUndefined();
      
      // Should batch update after timer
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      expect(result.current.sessions[0].gitStatus).toEqual(gitStatus1);
      expect(result.current.sessions[1].gitStatus).toEqual(gitStatus2);
    });

    it('should batch loading state updates with status updates', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      const gitStatus = createMockGitStatus({ state: 'modified' });
      
      act(() => {
        result.current.setSessions([session]);
      });
      
      // Add both loading and status updates
      act(() => {
        result.current.setGitStatusLoading(session.id, true);
        result.current.updateSessionGitStatus(session.id, gitStatus);
      });
      
      // Should not update immediately
      expect(result.current.isGitStatusLoading(session.id)).toBe(false);
      expect(result.current.sessions[0].gitStatus).toBeUndefined();
      
      // Should batch both updates
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      expect(result.current.isGitStatusLoading(session.id)).toBe(false); // Cleared by status update
      expect(result.current.sessions[0].gitStatus).toEqual(gitStatus);
    });

    it('should clear pending updates after processing', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      const gitStatus = createMockGitStatus({ state: 'modified' });
      
      act(() => {
        result.current.setSessions([session]);
      });
      
      act(() => {
        result.current.updateSessionGitStatus(session.id, gitStatus);
      });
      
      // Should have pending updates
      expect(result.current.pendingGitStatusUpdates.size).toBeGreaterThan(0);
      
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      // Should clear pending updates
      expect(result.current.pendingGitStatusUpdates.size).toBe(0);
    });
  });

  describe('getActiveSession', () => {
    it('should return active main repo session when available', () => {
      const { result } = renderHook(() => useSessionStore());
      const mainSession = createMockMainRepoSession();
      const regularSession = createMockSession();
      
      act(() => {
        result.current.setSessions([regularSession, mainSession]);
        useSessionStore.setState({ 
          activeSessionId: mainSession.id,
          activeMainRepoSession: mainSession
        });
      });
      
      const activeSession = result.current.getActiveSession();
      expect(activeSession).toEqual(mainSession);
    });

    it('should return regular session when no main repo session', () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession();
      
      act(() => {
        result.current.setSessions([session]);
        useSessionStore.setState({ activeSessionId: session.id });
      });
      
      const activeSession = result.current.getActiveSession();
      expect(activeSession).toEqual(session);
    });

    it('should return undefined when no active session', () => {
      const { result } = renderHook(() => useSessionStore());
      
      const activeSession = result.current.getActiveSession();
      expect(activeSession).toBeUndefined();
    });
  });

  describe('markSessionAsViewed', () => {
    it('should mark session as viewed successfully', async () => {
      const { result } = renderHook(() => useSessionStore());
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      await act(async () => {
        await result.current.markSessionAsViewed('session-123');
      });
      
      expect(API.sessions.markViewed).toHaveBeenCalledWith('session-123');
    });

    it('should handle mark viewed failure gracefully', async () => {
      const { result } = renderHook(() => useSessionStore());
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ 
        success: false, 
        error: 'Failed to mark viewed' 
      });
      
      await act(async () => {
        await result.current.markSessionAsViewed('session-123');
      });
      
      // Should not throw, just log error
      expect(API.sessions.markViewed).toHaveBeenCalledWith('session-123');
    });
  });

  describe('Complex Workflows', () => {
    it('should handle session lifecycle with outputs and git status', async () => {
      const { result } = renderHook(() => useSessionStore());
      const session = createMockSession({ status: 'initializing' });
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      // 1. Add new session
      act(() => {
        result.current.addSession(session);
      });
      
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.activeSessionId).toBe(session.id);
      
      // 2. Update session status to running
      act(() => {
        result.current.updateSession({ ...session, status: 'running' });
      });
      
      expect(result.current.sessions[0].status).toBe('running');
      
      // 3. Add some output
      const output = createMockSessionOutput({ 
        sessionId: session.id,
        data: 'Claude is working...'
      });
      
      act(() => {
        result.current.addSessionOutput(output);
      });
      
      expect(result.current.sessions[0].output).toContain('Claude is working...');
      
      // 4. Update git status
      const gitStatus = createMockGitStatus({ state: 'modified', filesChanged: 3 });
      
      // Set up fake timers before updating git status
      vi.useFakeTimers();
      
      // Verify git status is initially undefined
      expect(result.current.sessions[0].gitStatus).toBeUndefined();
      
      act(() => {
        result.current.updateSessionGitStatus(session.id, gitStatus);
      });
      
      // Verify pending state
      expect(result.current.pendingGitStatusUpdates.size).toBeGreaterThan(0);
      
      // 5. Process git status batch update
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      vi.useRealTimers();
      
      expect(result.current.sessions[0].gitStatus).toEqual(gitStatus);
      expect(result.current.pendingGitStatusUpdates.size).toBe(0);
      
      // 6. Complete session
      act(() => {
        result.current.updateSession({ ...session, status: 'completed_unviewed' });
      });
      
      expect(result.current.sessions[0].status).toBe('completed_unviewed');
      
      // 6.5. Clear active session to test marking as viewed
      await act(async () => {
        await result.current.setActiveSession(null);
      });
      
      // 7. Set as active (should mark as viewed)
      await act(async () => {
        await result.current.setActiveSession(session.id);
      });
      
      expect(API.sessions.markViewed).toHaveBeenCalledWith(session.id);
    });

    it('should handle dual session storage (regular + main repo)', async () => {
      const { result } = renderHook(() => useSessionStore());
      const regularSession = createMockSession({ id: 'regular' });
      const mainSession = createMockMainRepoSession({ id: 'main' });
      
      vi.mocked(API.sessions.markViewed).mockResolvedValue({ success: true });
      
      // Add both sessions
      act(() => {
        result.current.addSession(regularSession);
        result.current.addSession(mainSession);
      });
      
      expect(result.current.sessions).toHaveLength(2);
      
      // Set main session as active
      await act(async () => {
        await result.current.setActiveSession(mainSession.id);
      });
      
      expect(result.current.activeSessionId).toBe(mainSession.id);
      expect(result.current.activeMainRepoSession).toEqual({
        ...mainSession,
        output: [],
        jsonMessages: []
      });
      
      // Add output to main session
      const mainOutput = createMockSessionOutput({ 
        sessionId: mainSession.id,
        data: 'Main repo output'
      });
      
      act(() => {
        result.current.addSessionOutput(mainOutput);
      });
      
      // Should update both sessions array and activeMainRepoSession
      expect(result.current.sessions.find(s => s.id === mainSession.id)?.output).toContain('Main repo output');
      expect(result.current.activeMainRepoSession?.output).toContain('Main repo output');
      
      // Switch to regular session
      await act(async () => {
        await result.current.setActiveSession(regularSession.id);
      });
      
      expect(result.current.activeSessionId).toBe(regularSession.id);
      expect(result.current.activeMainRepoSession).toBeNull();
    });
  });
});