/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionView } from '../../src/hooks/useSessionView';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useErrorStore } from '../../src/stores/errorStore';
import { API } from '../../src/utils/api';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { Session } from '../../src/types/session';

// Add electronAPI types to window
declare global {
  interface Window {
    electronAPI: {
      sessions: {
        saveImages: (sessionId: string, images: any[]) => Promise<string[]>;
      };
    };
  }
}

// Mock dependencies
vi.mock('../../src/stores/sessionStore');
vi.mock('../../src/stores/errorStore');
vi.mock('../../src/utils/api');
vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));
vi.mock('../../src/utils/terminalTheme', () => ({
  getTerminalTheme: () => ({ background: '#000' }),
  getScriptTerminalTheme: () => ({ background: '#111' }),
}));
vi.mock('../../src/utils/performanceUtils', () => ({
  createVisibilityAwareInterval: (callback: Function, visibleInterval: number) => {
    const intervalId = setInterval(callback, visibleInterval);
    return () => clearInterval(intervalId);
  },
}));

describe('useSessionView', () => {
  // Mock data
  const mockSession: Session = {
    id: 'session-1',
    name: 'Test Session',
    status: 'running',
    projectId: 1,
    worktreePath: '/path/to/worktree',
    prompt: 'Test prompt',
    output: ['Output line 1', 'Output line 2'],
    jsonMessages: [],
    gitStatus: { state: 'clean' },
    runStartedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    archived: false,
  };

  // Mock refs
  const mockTerminalRef = {
    current: document.createElement('div'),
  };
  const mockScriptTerminalRef = {
    current: document.createElement('div'),
  };

  // Mock stores
  const mockSessionStore = {
    getActiveSession: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
    setSessionOutputs: vi.fn(),
    addTerminalOutput: vi.fn(),
    clearTerminalOutput: vi.fn(),
    setActiveSession: vi.fn(),
    updateSessionGitStatus: vi.fn(),
    setGitStatusLoading: vi.fn(),
    setGitStatusLoadingBatch: vi.fn(),
    updateSessionGitStatusBatch: vi.fn(),
    terminalOutput: {},
  };

  const mockErrorStore = {
    getState: vi.fn(() => ({
      showError: vi.fn(),
    })),
  };

  // Mock API
  const mockAPI = {
    sessions: {
      getOutput: vi.fn(),
      getConversationMessages: vi.fn(),
      sendInput: vi.fn(),
      continue: vi.fn(),
      stop: vi.fn(),
      runTerminalCommand: vi.fn(),
      sendTerminalInput: vi.fn(),
      resizeTerminal: vi.fn(),
      gitPull: vi.fn(),
      gitPush: vi.fn(),
      toggleAutoCommit: vi.fn(),
      rebaseMainIntoWorktree: vi.fn(),
      squashAndRebaseToMain: vi.fn(),
      rebaseToMain: vi.fn(),
      abortRebaseAndUseClaude: vi.fn(),
      getGitCommands: vi.fn(),
      hasChangesToRebase: vi.fn(),
      openIDE: vi.fn(),
      rename: vi.fn(),
      getPrompts: vi.fn(),
      generateCompactedContext: vi.fn(),
      saveImages: vi.fn(),
    },
    stravu: {
      getConnectionStatus: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mocks
    (useSessionStore as any).mockReturnValue(mockSessionStore);
    (useSessionStore as any).getState = vi.fn(() => mockSessionStore);
    (useSessionStore as any).subscribe = vi.fn(() => vi.fn()); // return unsubscribe function
    
    (useErrorStore as any).mockReturnValue(mockErrorStore);
    (useErrorStore as any).getState = vi.fn(() => mockErrorStore.getState());
    
    // Setup API mocks
    Object.assign(API, mockAPI);
    
    // Setup default API responses
    mockAPI.sessions.getOutput.mockResolvedValue({
      success: true,
      data: ['Output line 1', 'Output line 2'],
    });
    
    mockAPI.sessions.getConversationMessages.mockResolvedValue({
      success: true,
      data: [],
    });
    
    mockAPI.stravu.getConnectionStatus.mockResolvedValue({
      success: true,
      data: { status: 'disconnected' },
    });
    
    // Setup session store defaults
    mockSessionStore.getActiveSession.mockReturnValue(mockSession);
    mockSessionStore.getState.mockReturnValue(mockSessionStore);
    
    // Mock window.electronAPI
    (window as any).electronAPI = {
      sessions: {
        saveImages: vi.fn().mockResolvedValue(['/path/to/image1.png']),
      },
    };
    
    // Setup global event listeners
    global.window.addEventListener = vi.fn();
    global.window.removeEventListener = vi.fn();
    global.window.dispatchEvent = vi.fn();
    
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      expect(result.current.viewMode).toBe('richOutput');
      expect(result.current.isLoadingOutput).toBe(false);
      expect(result.current.input).toBe('');
      expect(result.current.ultrathink).toBe(false);
      expect(result.current.isEditingName).toBe(false);
    });

    it('should handle undefined active session', () => {
      const { result } = renderHook(() =>
        useSessionView(undefined, mockTerminalRef, mockScriptTerminalRef)
      );

      expect(result.current.viewMode).toBe('richOutput');
      expect(result.current.isLoadingOutput).toBe(false);
    });
  });

  describe('Session Output Loading', () => {
    it('should load output when session becomes active', async () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        vi.advanceTimersByTime(300); // Wait for debounce + load delay
      });

      await waitFor(() => {
        expect(mockAPI.sessions.getOutput).toHaveBeenCalledWith('session-1');
      });
    });

    it('should handle output loading errors gracefully', async () => {
      mockAPI.sessions.getOutput.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loadError).toBe('Network error');
      });
    });

    it('should retry loading for initializing sessions', async () => {
      const initializingSession = { ...mockSession, status: 'initializing' as const };
      mockAPI.sessions.getOutput
        .mockRejectedValueOnce(new Error('Not ready'))
        .mockResolvedValueOnce({ success: true, data: ['Output'] });

      const { result } = renderHook(() =>
        useSessionView(initializingSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        vi.advanceTimersByTime(600); // Initial delay
      });

      await act(async () => {
        vi.advanceTimersByTime(1000); // Retry delay
      });

      await waitFor(() => {
        expect(mockAPI.sessions.getOutput).toHaveBeenCalledTimes(2);
      });
    });

    it('should abort loading when session changes', async () => {
      const { result, rerender } = renderHook(
        ({ session }) => useSessionView(session, mockTerminalRef, mockScriptTerminalRef),
        { initialProps: { session: mockSession } }
      );

      // Start loading
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Change session
      const newSession = { ...mockSession, id: 'session-2' };
      await act(async () => {
        rerender({ session: newSession });
      });

      // Should reset loading state
      expect(result.current.isLoadingOutput).toBe(false);
    });
  });

  describe('Terminal Management', () => {
    it('should initialize terminal when switching to terminal view', async () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setViewMode('terminal');
      });

      // Terminal should be initialized
      expect(Terminal).toHaveBeenCalled();
      expect(FitAddon).toHaveBeenCalled();
    });

    it('should handle terminal resize', async () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setViewMode('terminal');
      });

      // Trigger resize
      const resizeObserver = (global.ResizeObserver as any).mock.calls[0][0];
      act(() => {
        resizeObserver();
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(mockAPI.sessions.resizeTerminal).toHaveBeenCalled();
    });

    it('should clear terminal output when requested', async () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setViewMode('terminal');
        result.current.handleClearTerminal();
      });

      expect(mockSessionStore.clearTerminalOutput).toHaveBeenCalledWith('session-1');
    });
  });

  describe('Input Handling', () => {
    it('should send input to session', async () => {
      mockAPI.sessions.sendInput.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setInput('Test input');
        await result.current.handleSendInput();
      });

      expect(mockAPI.sessions.sendInput).toHaveBeenCalledWith('session-1', 'Test input\n');
      expect(result.current.input).toBe(''); // Input should be cleared
    });

    it('should restore input on send failure', async () => {
      mockAPI.sessions.sendInput.mockResolvedValue({ success: false, error: 'Failed' });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setInput('Test input');
        await result.current.handleSendInput();
      });

      expect(result.current.input).toBe('Test input'); // Input should be restored
    });

    it('should handle ultrathink mode', async () => {
      mockAPI.sessions.sendInput.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setInput('Test input');
        result.current.setUltrathink(true);
        await result.current.handleSendInput();
      });

      expect(mockAPI.sessions.sendInput).toHaveBeenCalledWith('session-1', 'Test input\nultrathink\n');
    });

    it('should handle image attachments', async () => {
      mockAPI.sessions.sendInput.mockResolvedValue({ success: true });
      const mockImages = [
        { name: 'test.png', dataUrl: 'data:image/png;base64,abc', type: 'image/png' }
      ];

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setInput('Test input');
        await result.current.handleSendInput(mockImages);
      });

      expect(window.electronAPI.sessions.saveImages).toHaveBeenCalledWith('session-1', [{
        name: 'test.png',
        dataUrl: 'data:image/png;base64,abc',
        type: 'image/png',
      }]);
    });
  });

  describe('Conversation Continuation', () => {
    it('should continue conversation with history', async () => {
      mockAPI.sessions.continue.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setInput('Continue conversation');
        await result.current.handleContinueConversation();
      });

      expect(mockAPI.sessions.continue).toHaveBeenCalledWith('session-1', 'Continue conversation', undefined);
    });

    it('should continue with specific model', async () => {
      mockAPI.sessions.continue.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setInput('Continue with model');
        await result.current.handleContinueConversation([], 'claude-3-opus');
      });

      expect(mockAPI.sessions.continue).toHaveBeenCalledWith('session-1', 'Continue with model', 'claude-3-opus');
    });
  });

  describe('Git Operations', () => {
    beforeEach(() => {
      mockAPI.sessions.getGitCommands.mockResolvedValue({
        success: true,
        data: { mainBranch: 'main', currentBranch: 'feature' },
      });
      mockAPI.sessions.hasChangesToRebase.mockResolvedValue({
        success: true,
        data: true,
      });
    });

    it('should handle git pull', async () => {
      mockAPI.sessions.gitPull.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        await result.current.handleGitPull();
      });

      expect(mockAPI.sessions.gitPull).toHaveBeenCalledWith('session-1');
      expect(result.current.isMerging).toBe(false);
    });

    it('should handle git pull conflicts', async () => {
      mockAPI.sessions.gitPull.mockResolvedValue({
        success: false,
        error: 'conflict detected',
        details: 'Merge conflict in file.txt',
      });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        await result.current.handleGitPull();
      });

      expect(result.current.showGitErrorDialog).toBe(true);
      expect(result.current.gitErrorDetails).toEqual({
        title: 'Pull Failed - Merge Conflicts',
        message: 'There are merge conflicts that need to be resolved manually.',
        command: 'git pull',
        output: 'Merge conflict in file.txt',
        workingDirectory: '/path/to/worktree',
      });
    });

    it('should handle rebase main into worktree', async () => {
      mockAPI.sessions.rebaseMainIntoWorktree.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        await result.current.handleRebaseMainIntoWorktree();
      });

      expect(mockAPI.sessions.rebaseMainIntoWorktree).toHaveBeenCalledWith('session-1');
      expect(result.current.isMerging).toBe(false);
    });

    it('should handle squash and rebase to main', async () => {
      mockAPI.sessions.squashAndRebaseToMain.mockResolvedValue({ success: true });
      mockAPI.sessions.getPrompts.mockResolvedValue({
        success: true,
        data: [{ prompt_text: 'Test prompt' }],
      });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      // Trigger squash dialog
      await act(async () => {
        await result.current.handleSquashAndRebaseToMain();
      });

      expect(result.current.showCommitMessageDialog).toBe(true);

      // Perform squash
      await act(async () => {
        await result.current.performSquashWithCommitMessage('Test commit message');
      });

      expect(mockAPI.sessions.squashAndRebaseToMain).toHaveBeenCalledWith('session-1', 'Test commit message');
    });
  });

  describe('Context Compaction', () => {
    it('should generate and display compacted context', async () => {
      const mockTerminal = {
        write: vi.fn(),
        scrollToBottom: vi.fn(),
      };
      (Terminal as any).mockImplementation(() => mockTerminal);

      mockAPI.sessions.generateCompactedContext.mockResolvedValue({
        success: true,
        data: { summary: 'Compacted context summary' },
      });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        await result.current.handleCompactContext();
      });

      expect(mockAPI.sessions.generateCompactedContext).toHaveBeenCalledWith('session-1');
      expect(result.current.contextCompacted).toBe(true);
      expect(result.current.compactedContext).toBe('Compacted context summary');
    });

    it('should inject compacted context into next input', async () => {
      mockAPI.sessions.sendInput.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      // Set up compacted context
      await act(async () => {
        result.current.setViewMode('richOutput'); // Set to a view mode that uses compacted context
      });

      // Manually set compacted context (simulating successful compaction)
      await act(async () => {
        (result.current as any).setContextCompacted(true);
        (result.current as any).setCompactedContext('Compacted context');
      });

      // Send input with compacted context
      await act(async () => {
        result.current.setInput('New input');
        await result.current.handleSendInput();
      });

      expect(mockAPI.sessions.sendInput).toHaveBeenCalledWith(
        'session-1',
        '<session_context>\nCompacted context\n</session_context>\n\nNew input\n'
      );
    });
  });

  describe('Session Name Editing', () => {
    it('should handle session name editing', async () => {
      mockAPI.sessions.rename.mockResolvedValue({ success: true });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.handleStartEditName();
      });

      expect(result.current.isEditingName).toBe(true);
      expect(result.current.editName).toBe('Test Session');

      await act(async () => {
        result.current.setEditName('New Session Name');
        await result.current.handleSaveEditName();
      });

      expect(mockAPI.sessions.rename).toHaveBeenCalledWith('session-1', 'New Session Name');
      expect(result.current.isEditingName).toBe(false);
    });

    it('should handle keyboard shortcuts for name editing', async () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.handleStartEditName();
      });

      // Test Enter key
      const enterEvent = { key: 'Enter', preventDefault: vi.fn() } as any;
      await act(async () => {
        result.current.handleNameKeyDown(enterEvent);
      });

      expect(enterEvent.preventDefault).toHaveBeenCalled();

      // Test Escape key
      const escapeEvent = { key: 'Escape', preventDefault: vi.fn() } as any;
      await act(async () => {
        result.current.handleNameKeyDown(escapeEvent);
      });

      expect(result.current.isEditingName).toBe(false);
    });
  });

  describe('Event Listeners', () => {
    it('should listen for session output available events', async () => {
      renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      // Simulate output available event
      const event = new CustomEvent('session-output-available', {
        detail: { sessionId: 'session-1' },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      expect(window.addEventListener).toHaveBeenCalledWith(
        'session-output-available',
        expect.any(Function)
      );
    });

    it('should listen for prompt navigation events', async () => {
      renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      const event = new CustomEvent('navigateToPrompt', {
        detail: {
          sessionId: 'session-1',
          promptMarker: { prompt_text: 'Test prompt', output_line: 10 },
        },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      expect(window.addEventListener).toHaveBeenCalledWith(
        'navigateToPrompt',
        expect.any(Function)
      );
    });

    it('should handle session deletion events', async () => {
      renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      const event = new CustomEvent('session-deleted', {
        detail: { id: 'session-1' },
      });

      await act(async () => {
        window.dispatchEvent(event);
      });

      expect(window.addEventListener).toHaveBeenCalledWith(
        'session-deleted',
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.sessions.getOutput.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loadError).toBe('API Error');
      });
    });

    it('should handle git operation errors', async () => {
      mockAPI.sessions.gitPull.mockResolvedValue({
        success: false,
        error: 'Git operation failed',
      });

      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        await result.current.handleGitPull();
      });

      expect(result.current.mergeError).toBe('Git operation failed');
    });
  });

  describe('Performance', () => {
    it('should debounce session switching', async () => {
      const { result, rerender } = renderHook(
        ({ session }) => useSessionView(session, mockTerminalRef, mockScriptTerminalRef),
        { initialProps: { session: mockSession } }
      );

      // Rapidly switch sessions
      const session2 = { ...mockSession, id: 'session-2' };
      const session3 = { ...mockSession, id: 'session-3' };

      await act(async () => {
        rerender({ session: session2 });
        rerender({ session: session3 });
        vi.advanceTimersByTime(150); // Debounce delay
      });

      // Should only process the final session
      expect(mockAPI.sessions.getOutput).toHaveBeenCalledWith('session-3');
    });

    it('should handle rapid view mode changes', async () => {
      const { result } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      await act(async () => {
        result.current.setViewMode('terminal');
        result.current.setViewMode('changes');
        result.current.setViewMode('richOutput');
      });

      expect(result.current.viewMode).toBe('richOutput');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => // eslint-disable-line @typescript-eslint/no-unused-vars
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      unmount();

      expect(window.removeEventListener).toHaveBeenCalled();
    });

    it('should abort pending requests on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useSessionView(mockSession, mockTerminalRef, mockScriptTerminalRef)
      );

      // Start loading
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      unmount();

      // Should not continue with API calls after unmount
      expect(result.current.isLoadingOutput).toBe(false);
    });
  });
});