import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIPCEvents } from '../../src/hooks/useIPCEvents';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useErrorStore } from '../../src/stores/errorStore';
import { API } from '../../src/utils/api';
import type { Session, SessionOutput, GitStatus } from '../../src/types/session';

// Mock dependencies
vi.mock('../../src/stores/sessionStore');
vi.mock('../../src/stores/errorStore');
vi.mock('../../src/utils/api');

describe('useIPCEvents', () => {
  // Mock data
  const mockSession: Session = {
    id: 'session-1',
    name: 'Test Session',
    status: 'running',
    projectId: 1,
    worktreePath: '/path/to/worktree',
    prompt: 'Test prompt',
    output: ['Output line 1'],
    jsonMessages: [],
    createdAt: new Date().toISOString(),
    archived: false,
  };

  const mockGitStatus: GitStatus = {
    state: 'modified',
    ahead: 2,
    behind: 0,
    hasUncommittedChanges: true,
  };

  const mockSessionOutput: SessionOutput = {
    sessionId: 'session-1',
    type: 'stdout',
    data: 'New output data',
    timestamp: new Date().toISOString(),
  };

  // Mock stores
  const mockSessionStore = {
    setSessions: vi.fn(),
    loadSessions: vi.fn(),
    addSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    getState: vi.fn(),
    setGitStatusLoading: vi.fn(),
    updateSessionGitStatus: vi.fn(),
    setGitStatusLoadingBatch: vi.fn(),
    updateSessionGitStatusBatch: vi.fn(),
    addTerminalOutput: vi.fn(),
  };

  const mockErrorStore = {
    showError: vi.fn(),
  };

  // Mock API
  const mockAPI = {
    sessions: {
      getAll: vi.fn(),
    },
  };

  // Mock electron API events
  const mockEvents = {
    onSessionCreated: vi.fn(),
    onSessionUpdated: vi.fn(),
    onSessionDeleted: vi.fn(),
    onSessionsLoaded: vi.fn(),
    onSessionOutput: vi.fn(),
    onTerminalOutput: vi.fn(),
    onSessionOutputAvailable: vi.fn(),
    onZombieProcessesDetected: vi.fn(),
    onGitStatusUpdated: vi.fn(),
    onGitStatusLoading: vi.fn(),
    onGitStatusLoadingBatch: vi.fn(),
    onGitStatusUpdatedBatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mocks
    (useSessionStore as any).mockReturnValue(mockSessionStore);
    (useSessionStore as any).getState = vi.fn(() => mockSessionStore);
    
    (useErrorStore as any).mockReturnValue(mockErrorStore);
    
    // Setup API mocks
    Object.assign(API, mockAPI);
    mockAPI.sessions.getAll.mockResolvedValue({
      success: true,
      data: [mockSession],
    });
    
    // Setup electron API
    (window as any).electronAPI = {
      events: mockEvents,
    };
    
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Setup default return values for event handlers (mock unsubscribe functions)
    Object.values(mockEvents).forEach(eventMock => {
      eventMock.mockReturnValue(vi.fn()); // Return unsubscribe function
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize and return socket-like object', () => {
      const { result } = renderHook(() => useIPCEvents());

      expect(result.current.connected).toBe(true);
      expect(typeof result.current.disconnect).toBe('function');
    });

    it('should warn when electron API is not available', () => {
      delete (window as any).electronAPI;
      
      renderHook(() => useIPCEvents());

      expect(console.warn).toHaveBeenCalledWith('Electron API not available, events will not work');
    });

    it('should load initial sessions on mount', async () => {
      renderHook(() => useIPCEvents());

      await waitFor(() => {
        expect(mockAPI.sessions.getAll).toHaveBeenCalled();
        expect(mockSessionStore.loadSessions).toHaveBeenCalledWith([
          { ...mockSession, jsonMessages: [] }
        ]);
      });
    });

    it('should handle API error when loading initial sessions', async () => {
      mockAPI.sessions.getAll.mockRejectedValue(new Error('API Error'));

      renderHook(() => useIPCEvents());

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Failed to load initial sessions:', expect.any(Error));
      });
    });
  });

  describe('Event Listeners Setup', () => {
    it('should setup all required event listeners', () => {
      renderHook(() => useIPCEvents());

      expect(mockEvents.onSessionCreated).toHaveBeenCalled();
      expect(mockEvents.onSessionUpdated).toHaveBeenCalled();
      expect(mockEvents.onSessionDeleted).toHaveBeenCalled();
      expect(mockEvents.onSessionsLoaded).toHaveBeenCalled();
      expect(mockEvents.onSessionOutput).toHaveBeenCalled();
      expect(mockEvents.onTerminalOutput).toHaveBeenCalled();
      expect(mockEvents.onSessionOutputAvailable).toHaveBeenCalled();
      expect(mockEvents.onZombieProcessesDetected).toHaveBeenCalled();
      expect(mockEvents.onGitStatusUpdated).toHaveBeenCalled();
      expect(mockEvents.onGitStatusLoading).toHaveBeenCalled();
    });

    it('should handle optional event listeners gracefully', () => {
      // Some events might not be available in all versions
      delete (mockEvents as any).onGitStatusLoading;
      delete (mockEvents as any).onGitStatusLoadingBatch;
      delete (mockEvents as any).onGitStatusUpdatedBatch;

      expect(() => {
        renderHook(() => useIPCEvents());
      }).not.toThrow();
    });
  });

  describe('Session Events', () => {
    it('should handle session created event', () => {
      renderHook(() => useIPCEvents());
      
      const sessionCreatedHandler = mockEvents.onSessionCreated.mock.calls[0][0];
      const newSession = { ...mockSession, id: 'session-2' };

      act(() => {
        sessionCreatedHandler(newSession);
      });

      expect(mockSessionStore.addSession).toHaveBeenCalledWith({
        ...newSession,
        output: [],
        jsonMessages: [],
      });
      expect(mockSessionStore.setGitStatusLoading).toHaveBeenCalledWith('session-2', true);
    });

    it('should handle session updated event', () => {
      mockSessionStore.getState.mockReturnValue({
        activeSessionId: 'session-1',
      });

      renderHook(() => useIPCEvents());
      
      const sessionUpdatedHandler = mockEvents.onSessionUpdated.mock.calls[0][0];
      const updatedSession = { ...mockSession, status: 'completed_unviewed' as const };

      act(() => {
        sessionUpdatedHandler(updatedSession);
      });

      expect(mockSessionStore.updateSession).toHaveBeenCalledWith({
        ...updatedSession,
        output: [],
        jsonMessages: [],
      });
    });

    it('should dispatch custom event for active session status changes', () => {
      mockSessionStore.getState.mockReturnValue({
        activeSessionId: 'session-1',
      });

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      renderHook(() => useIPCEvents());
      
      const sessionUpdatedHandler = mockEvents.onSessionUpdated.mock.calls[0][0];
      const updatedSession = { ...mockSession, status: 'stopped' as const };

      act(() => {
        sessionUpdatedHandler(updatedSession);
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-status-changed',
          detail: { sessionId: 'session-1', status: 'stopped' },
        })
      );
    });

    it('should handle invalid session data gracefully', () => {
      renderHook(() => useIPCEvents());
      
      const sessionUpdatedHandler = mockEvents.onSessionUpdated.mock.calls[0][0];

      act(() => {
        sessionUpdatedHandler(null);
      });

      expect(console.error).toHaveBeenCalledWith('[useIPCEvents] Invalid session data received:', null);
      expect(mockSessionStore.updateSession).not.toHaveBeenCalled();
    });

    it('should handle session deleted event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      renderHook(() => useIPCEvents());
      
      const sessionDeletedHandler = mockEvents.onSessionDeleted.mock.calls[0][0];

      act(() => {
        sessionDeletedHandler({ id: 'session-1' });
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-deleted',
          detail: { id: 'session-1' },
        })
      );
      expect(mockSessionStore.deleteSession).toHaveBeenCalledWith({ id: 'session-1' });
    });

    it('should handle sessions loaded event', () => {
      renderHook(() => useIPCEvents());
      
      const sessionsLoadedHandler = mockEvents.onSessionsLoaded.mock.calls[0][0];
      const sessions = [mockSession, { ...mockSession, id: 'session-2' }];

      act(() => {
        sessionsLoadedHandler(sessions);
      });

      expect(mockSessionStore.loadSessions).toHaveBeenCalledWith(
        sessions.map(s => ({ ...s, jsonMessages: [] }))
      );
      // Should set git status loading for sessions without git status
      expect(mockSessionStore.setGitStatusLoading).toHaveBeenCalledWith('session-1', true);
    });
  });

  describe('Output Events', () => {
    it('should handle session output event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      renderHook(() => useIPCEvents());
      
      const sessionOutputHandler = mockEvents.onSessionOutput.mock.calls[0][0];

      act(() => {
        sessionOutputHandler(mockSessionOutput);
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-output-available',
          detail: { sessionId: 'session-1' },
        })
      );
    });

    it('should handle terminal output event', () => {
      renderHook(() => useIPCEvents());
      
      const terminalOutputHandler = mockEvents.onTerminalOutput.mock.calls[0][0];
      const terminalOutput = {
        sessionId: 'session-1',
        type: 'stdout' as const,
        data: 'Terminal output',
      };

      act(() => {
        terminalOutputHandler(terminalOutput);
      });

      expect(mockSessionStore.addTerminalOutput).toHaveBeenCalledWith(terminalOutput);
    });

    it('should handle session output available event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      renderHook(() => useIPCEvents());
      
      const outputAvailableHandler = mockEvents.onSessionOutputAvailable.mock.calls[0][0];

      act(() => {
        outputAvailableHandler({ sessionId: 'session-1' });
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session-output-available',
          detail: { sessionId: 'session-1' },
        })
      );
    });
  });

  describe('Git Status Events', () => {
    it('should handle git status updated event (throttled)', () => {
      vi.useFakeTimers();

      renderHook(() => useIPCEvents());
      
      const gitStatusHandler = mockEvents.onGitStatusUpdated.mock.calls[0][0];

      // Call handler multiple times rapidly
      act(() => {
        gitStatusHandler({ sessionId: 'session-1', gitStatus: mockGitStatus });
        gitStatusHandler({ sessionId: 'session-1', gitStatus: mockGitStatus });
        gitStatusHandler({ sessionId: 'session-1', gitStatus: mockGitStatus });
      });

      expect(mockSessionStore.updateSessionGitStatus).not.toHaveBeenCalled();

      // Advance timers to trigger throttled execution
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(mockSessionStore.updateSessionGitStatus).toHaveBeenCalledWith('session-1', mockGitStatus);

      vi.useRealTimers();
    });

    it('should handle git status loading event (throttled)', () => {
      vi.useFakeTimers();

      renderHook(() => useIPCEvents());
      
      const gitStatusLoadingHandler = mockEvents.onGitStatusLoading.mock.calls[0][0];

      act(() => {
        gitStatusLoadingHandler({ sessionId: 'session-1' });
      });

      expect(mockSessionStore.setGitStatusLoading).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(mockSessionStore.setGitStatusLoading).toHaveBeenCalledWith('session-1', true);

      vi.useRealTimers();
    });

    it('should handle batch git status events', () => {
      renderHook(() => useIPCEvents());
      
      const batchLoadingHandler = mockEvents.onGitStatusLoadingBatch.mock.calls[0][0];
      const batchUpdatedHandler = mockEvents.onGitStatusUpdatedBatch.mock.calls[0][0];

      act(() => {
        batchLoadingHandler(['session-1', 'session-2']);
      });

      expect(mockSessionStore.setGitStatusLoadingBatch).toHaveBeenCalledWith([
        { sessionId: 'session-1', loading: true },
        { sessionId: 'session-2', loading: true },
      ]);

      const updates = [
        { sessionId: 'session-1', status: mockGitStatus },
        { sessionId: 'session-2', status: mockGitStatus },
      ];

      act(() => {
        batchUpdatedHandler(updates);
      });

      expect(mockSessionStore.updateSessionGitStatusBatch).toHaveBeenCalledWith(updates);
    });
  });

  describe('Error Handling', () => {
    it('should handle zombie processes detected event', () => {
      renderHook(() => useIPCEvents());
      
      const zombieHandler = mockEvents.onZombieProcessesDetected.mock.calls[0][0];
      const zombieData = {
        sessionId: 'session-1',
        pids: [1234, 5678],
        message: 'Some processes could not be terminated',
      };

      act(() => {
        zombieHandler(zombieData);
      });

      expect(mockErrorStore.showError).toHaveBeenCalledWith({
        title: 'Zombie Processes Detected',
        error: 'Some processes could not be terminated',
        details: 'Unable to terminate process IDs: 1234, 5678\n\nYou may need to manually kill these processes.',
      });
    });

    it('should handle zombie processes without PIDs', () => {
      renderHook(() => useIPCEvents());
      
      const zombieHandler = mockEvents.onZombieProcessesDetected.mock.calls[0][0];
      const zombieData = {
        message: 'Generic zombie process error',
      };

      act(() => {
        zombieHandler(zombieData);
      });

      expect(mockErrorStore.showError).toHaveBeenCalledWith({
        title: 'Zombie Processes Detected',
        error: 'Generic zombie process error',
        details: undefined,
      });
    });
  });

  describe('Throttling', () => {
    it('should throttle rapid git status updates correctly', () => {
      vi.useFakeTimers();

      renderHook(() => useIPCEvents());
      
      const gitStatusHandler = mockEvents.onGitStatusUpdated.mock.calls[0][0];

      // Rapid calls within throttle window
      act(() => {
        gitStatusHandler({ sessionId: 'session-1', gitStatus: { state: 'clean' } });
        vi.advanceTimersByTime(50);
        gitStatusHandler({ sessionId: 'session-1', gitStatus: { state: 'modified' } });
        vi.advanceTimersByTime(50);
        gitStatusHandler({ sessionId: 'session-1', gitStatus: { state: 'ahead' } });
      });

      // Should not have called store yet
      expect(mockSessionStore.updateSessionGitStatus).not.toHaveBeenCalled();

      // Advance past throttle delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should only process the last call
      expect(mockSessionStore.updateSessionGitStatus).toHaveBeenCalledTimes(1);
      expect(mockSessionStore.updateSessionGitStatus).toHaveBeenCalledWith('session-1', { state: 'ahead' });

      vi.useRealTimers();
    });

    it('should handle multiple sessions in throttling', () => {
      vi.useFakeTimers();

      renderHook(() => useIPCEvents());
      
      const gitStatusHandler = mockEvents.onGitStatusUpdated.mock.calls[0][0];

      act(() => {
        gitStatusHandler({ sessionId: 'session-1', gitStatus: { state: 'clean' } });
        gitStatusHandler({ sessionId: 'session-2', gitStatus: { state: 'modified' } });
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should process both sessions
      expect(mockSessionStore.updateSessionGitStatus).toHaveBeenCalledTimes(2);
      expect(mockSessionStore.updateSessionGitStatus).toHaveBeenCalledWith('session-1', { state: 'clean' });
      expect(mockSessionStore.updateSessionGitStatus).toHaveBeenCalledWith('session-2', { state: 'modified' });

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const unsubscribeFns = Object.values(mockEvents).map(() => vi.fn());
      Object.values(mockEvents).forEach((eventMock, index) => {
        eventMock.mockReturnValue(unsubscribeFns[index]);
      });

      const { unmount } = renderHook(() => useIPCEvents());

      unmount();

      unsubscribeFns.forEach(unsubscribeFn => {
        expect(unsubscribeFn).toHaveBeenCalled();
      });
    });
  });

  describe('Console Logging', () => {
    it('should log session status changes in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      renderHook(() => useIPCEvents());
      
      const gitStatusHandler = mockEvents.onGitStatusUpdated.mock.calls[0][0];

      act(() => {
        gitStatusHandler({ sessionId: 'session-1', gitStatus: { state: 'clean' } });
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[useIPCEvents] Git status: session- → clean')
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should minimize logging in production for clean states', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      renderHook(() => useIPCEvents());
      
      const gitStatusHandler = mockEvents.onGitStatusUpdated.mock.calls[0][0];

      act(() => {
        gitStatusHandler({ sessionId: 'session-1', gitStatus: { state: 'clean' } });
      });

      // Should not log clean states in production
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Git status')
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});