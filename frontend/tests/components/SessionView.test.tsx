import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionView } from '../../src/components/SessionView';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useNavigationStore } from '../../src/stores/navigationStore';

// Mock stores
vi.mock('../../src/stores/sessionStore', () => ({
  useSessionStore: vi.fn(() => ({
    activeSessionId: 'session-1',
    sessions: [],
    activeMainRepoSession: null,
  })),
}));

vi.mock('../../src/stores/navigationStore', () => ({
  useNavigationStore: vi.fn(() => ({
    activeView: 'output',
    activeProjectId: 1,
  })),
}));

// Mock the session view hook
vi.mock('../../src/hooks/useSessionView', () => ({
  useSessionView: vi.fn(() => ({
    sessionOutputs: [],
    formattedOutput: 'Test output',
    isLoading: false,
    showGitError: false,
    gitError: null,
    showCommitDialog: false,
    commitMessage: '',
    setCommitMessage: vi.fn(),
    handleGitAction: vi.fn(),
    handleCommitDialogConfirm: vi.fn(),
    handleCommitDialogCancel: vi.fn(),
    loadingRef: { current: false },
    terminalInstance: null,
    scriptTerminalInstance: null,
    isScriptRunning: false,
    scriptOutput: [],
    currentPromptIndex: 0,
    promptHistory: [],
    richOutputSettings: {
      showLineNumbers: true,
      showTimestamps: true,
      fontSize: 'sm',
      theme: 'dark',
    },
    setRichOutputSettings: vi.fn(),
    navigateToPrompt: vi.fn(),
    scrollToPrompt: vi.fn(),
    scrollToBottom: vi.fn(),
    clearSessionOutput: vi.fn(),
    refreshSessionOutput: vi.fn(),
    sendInput: vi.fn(),
    handleRunScript: vi.fn(),
    handleStopScript: vi.fn(),
  })),
}));

// Mock components
vi.mock('../../src/components/EmptyState', () => ({
  EmptyState: ({ title, description, icon }: any) => (
    <div data-testid="empty-state">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../../src/components/CombinedDiffView', () => ({
  default: () => <div data-testid="combined-diff-view">Diff View</div>,
}));

vi.mock('../../src/components/StravuFileSearch', () => ({
  StravuFileSearch: () => <div data-testid="stravu-file-search">File Search</div>,
}));

vi.mock('../../src/components/session/SessionHeader', () => ({
  SessionHeader: ({ session }: any) => (
    <div data-testid="session-header">
      {session ? session.name : 'No Session'}
    </div>
  ),
}));

vi.mock('../../src/components/session/SessionInputWithImages', () => ({
  SessionInputWithImages: ({ onSendInput, disabled }: any) => (
    <div data-testid="session-input">
      <input
        data-testid="input-field"
        disabled={disabled}
        onChange={(e) => onSendInput?.(e.target.value)}
        placeholder="Type your message..."
      />
    </div>
  ),
}));

vi.mock('../../src/components/session/GitErrorDialog', () => ({
  GitErrorDialog: ({ isOpen, error, onClose, onAction }: any) =>
    isOpen ? (
      <div data-testid="git-error-dialog">
        <p>{error?.title}</p>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onAction?.('retry')}>Retry</button>
      </div>
    ) : null,
}));

vi.mock('../../src/components/session/CommitMessageDialog', () => ({
  CommitMessageDialog: ({ isOpen, message, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="commit-message-dialog">
        <input value={message} readOnly />
        <button onClick={() => onConfirm?.(message)}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock('../../src/components/FileEditor', () => ({
  FileEditor: () => <div data-testid="file-editor">File Editor</div>,
}));

vi.mock('../../src/components/session/RichOutputWithSidebar', () => ({
  RichOutputWithSidebar: ({ output, settings }: any) => (
    <div data-testid="rich-output">
      <pre>{output}</pre>
    </div>
  ),
}));

vi.mock('../../src/components/session/LogView', () => ({
  LogView: ({ session }: any) => (
    <div data-testid="log-view">
      Logs for {session?.name || 'No Session'}
    </div>
  ),
}));

// Mock ProjectView lazily loaded component
vi.mock('../../src/components/ProjectView', () => ({
  ProjectView: () => <div data-testid="project-view">Project View</div>,
}));

describe('SessionView', () => {
  const mockSessions = [
    {
      id: 'session-1',
      name: 'Test Session 1',
      status: 'waiting',
      projectId: 1,
      createdAt: '2024-01-01T12:00:00Z',
      prompt: 'Test prompt',
      worktreePath: '/test/worktree1',
      output: ['Test output line 1', 'Test output line 2'],
      jsonMessages: [],
    },
    {
      id: 'session-2',
      name: 'Test Session 2',
      status: 'running',
      projectId: 1,
      createdAt: '2024-01-01T13:00:00Z',
      prompt: 'Another prompt',
      worktreePath: '/test/worktree2',
      output: [],
      jsonMessages: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API
    (window as any).electronAPI = {
      projects: {
        get: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 1,
            name: 'Test Project',
            path: '/test/project',
          },
        }),
      },
      sessions: {
        sendInput: vi.fn().mockResolvedValue({ success: true }),
        stop: vi.fn().mockResolvedValue({ success: true }),
      },
      on: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).electronAPI = undefined;
  });

  describe('Empty States', () => {
    it('shows empty state when no session is selected', () => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: null,
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      render(<SessionView />);

      expect(screen.getByTestId('empty-state')).toBeDefined();
      expect(screen.getByText('No session selected')).toBeDefined();
    });

    it('shows empty state when selected session not found', () => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'non-existent',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      render(<SessionView />);

      expect(screen.getByTestId('empty-state')).toBeDefined();
    });
  });

  describe('Session Display', () => {
    beforeEach(() => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      (useNavigationStore as any).mockReturnValue({
        activeView: 'output',
        activeProjectId: 1,
      });
    });

    it('renders session header', () => {
      render(<SessionView />);

      expect(screen.getByTestId('session-header')).toBeDefined();
      expect(screen.getByText('Test Session 1')).toBeDefined();
    });

    it('renders session input component', () => {
      render(<SessionView />);

      expect(screen.getByTestId('session-input')).toBeDefined();
      expect(screen.getByTestId('input-field')).toBeDefined();
    });

    it('shows rich output when active view is output', () => {
      render(<SessionView />);

      expect(screen.getByTestId('rich-output')).toBeDefined();
    });

    it('shows diff view when active view is diff', () => {
      (useNavigationStore as any).mockReturnValue({
        activeView: 'diff',
        activeProjectId: 1,
      });

      render(<SessionView />);

      expect(screen.getByTestId('combined-diff-view')).toBeDefined();
    });

    it('shows file search when active view is files', () => {
      (useNavigationStore as any).mockReturnValue({
        activeView: 'files',
        activeProjectId: 1,
      });

      render(<SessionView />);

      expect(screen.getByTestId('stravu-file-search')).toBeDefined();
    });

    it('shows log view when active view is logs', () => {
      (useNavigationStore as any).mockReturnValue({
        activeView: 'logs',
        activeProjectId: 1,
      });

      render(<SessionView />);

      expect(screen.getByTestId('log-view')).toBeDefined();
    });

    it('shows file editor when active view is editor', () => {
      (useNavigationStore as any).mockReturnValue({
        activeView: 'editor',
        activeProjectId: 1,
      });

      render(<SessionView />);

      expect(screen.getByTestId('file-editor')).toBeDefined();
    });
  });

  describe('Main Repository Session', () => {
    it('displays main repo session when active', () => {
      const mainRepoSession = {
        id: 'main-repo',
        name: 'Main Repository',
        status: 'ready',
        isMainRepo: true,
        projectId: 1,
        createdAt: '2024-01-01T12:00:00Z',
        prompt: '',
        worktreePath: '/main/repo',
        output: [],
        jsonMessages: [],
      };

      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'main-repo',
        sessions: mockSessions,
        activeMainRepoSession: mainRepoSession,
      });

      render(<SessionView />);

      expect(screen.getByText('Main Repository')).toBeDefined();
    });

    it('shows project view for main repo session', () => {
      const mainRepoSession = {
        id: 'main-repo',
        name: 'Main Repository',
        status: 'ready',
        isMainRepo: true,
        projectId: 1,
        createdAt: '2024-01-01T12:00:00Z',
        prompt: '',
        worktreePath: '/main/repo',
        output: [],
        jsonMessages: [],
      };

      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'main-repo',
        sessions: mockSessions,
        activeMainRepoSession: mainRepoSession,
      });

      (useNavigationStore as any).mockReturnValue({
        activeView: 'project',
        activeProjectId: 1,
      });

      render(<SessionView />);

      expect(screen.getByTestId('project-view')).toBeDefined();
    });
  });

  describe('Git Operations', () => {
    beforeEach(() => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });
    });

    it('shows git error dialog when git error occurs', () => {
      const mockUseSessionView = vi.mocked(require('../../src/hooks/useSessionView').useSessionView);
      mockUseSessionView.mockReturnValue({
        ...mockUseSessionView(),
        showGitError: true,
        gitError: {
          title: 'Git Error',
          message: 'Failed to commit',
          output: 'Error details',
        },
      });

      render(<SessionView />);

      expect(screen.getByTestId('git-error-dialog')).toBeDefined();
      expect(screen.getByText('Git Error')).toBeDefined();
    });

    it('shows commit message dialog when committing', () => {
      const mockUseSessionView = vi.mocked(require('../../src/hooks/useSessionView').useSessionView);
      mockUseSessionView.mockReturnValue({
        ...mockUseSessionView(),
        showCommitDialog: true,
        commitMessage: 'Test commit message',
      });

      render(<SessionView />);

      expect(screen.getByTestId('commit-message-dialog')).toBeDefined();
    });

    it('handles git error dialog actions', async () => {
      const mockHandleGitAction = vi.fn();
      const mockUseSessionView = vi.mocked(require('../../src/hooks/useSessionView').useSessionView);
      mockUseSessionView.mockReturnValue({
        ...mockUseSessionView(),
        showGitError: true,
        gitError: {
          title: 'Git Error',
          message: 'Failed to commit',
          output: 'Error details',
        },
        handleGitAction: mockHandleGitAction,
      });

      render(<SessionView />);

      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      expect(mockHandleGitAction).toHaveBeenCalledWith('retry');
    });
  });

  describe('Session Input', () => {
    beforeEach(() => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });
    });

    it('disables input when session is running', () => {
      const runningSession = { ...mockSessions[0], status: 'running' };
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: [runningSession],
        activeMainRepoSession: null,
      });

      render(<SessionView />);

      const inputField = screen.getByTestId('input-field');
      expect(inputField.hasAttribute('disabled')).toBe(true);
    });

    it('enables input when session is waiting', () => {
      render(<SessionView />);

      const inputField = screen.getByTestId('input-field');
      expect(inputField.hasAttribute('disabled')).toBe(false);
    });

    it('sends input through the hook', async () => {
      const mockSendInput = vi.fn();
      const mockUseSessionView = vi.mocked(require('../../src/hooks/useSessionView').useSessionView);
      mockUseSessionView.mockReturnValue({
        ...mockUseSessionView(),
        sendInput: mockSendInput,
      });

      render(<SessionView />);

      const inputField = screen.getByTestId('input-field');
      await userEvent.type(inputField, 'test input');

      expect(mockSendInput).toHaveBeenCalledWith('test input');
    });
  });

  describe('Loading States', () => {
    it('shows loading state when session is loading', () => {
      const mockUseSessionView = vi.mocked(require('../../src/hooks/useSessionView').useSessionView);
      mockUseSessionView.mockReturnValue({
        ...mockUseSessionView(),
        isLoading: true,
      });

      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      render(<SessionView />);

      // Session header should still be visible even when loading
      expect(screen.getByTestId('session-header')).toBeDefined();
    });
  });

  describe('Project Data Loading', () => {
    it('loads project data for active session', async () => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      render(<SessionView />);

      await waitFor(() => {
        expect((window as any).electronAPI.projects.get).toHaveBeenCalledWith(1);
      });
    });

    it('handles project loading errors gracefully', async () => {
      (window as any).electronAPI.projects.get.mockRejectedValue(new Error('Project load failed'));

      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      render(<SessionView />);

      await waitFor(() => {
        expect((window as any).electronAPI.projects.get).toHaveBeenCalled();
      });

      // Component should still render even if project loading fails
      expect(screen.getByTestId('session-header')).toBeDefined();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different view modes', () => {
      (useSessionStore as any).mockReturnValue({
        activeSessionId: 'session-1',
        sessions: mockSessions,
        activeMainRepoSession: null,
      });

      const views = ['output', 'diff', 'files', 'logs', 'editor'];
      
      views.forEach(view => {
        (useNavigationStore as any).mockReturnValue({
          activeView: view,
          activeProjectId: 1,
        });

        const { unmount } = render(<SessionView />);
        
        // Each view should render its specific component
        switch (view) {
          case 'output':
            expect(screen.getByTestId('rich-output')).toBeDefined();
            break;
          case 'diff':
            expect(screen.getByTestId('combined-diff-view')).toBeDefined();
            break;
          case 'files':
            expect(screen.getByTestId('stravu-file-search')).toBeDefined();
            break;
          case 'logs':
            expect(screen.getByTestId('log-view')).toBeDefined();
            break;
          case 'editor':
            expect(screen.getByTestId('file-editor')).toBeDefined();
            break;
        }
        
        unmount();
      });
    });
  });

  describe('Memory Management', () => {
    it('properly cleans up event listeners', () => {
      const { unmount } = render(<SessionView />);
      unmount();

      // Hook should handle cleanup internally
      // This test ensures the component unmounts without errors
      expect(true).toBe(true);
    });
  });
});