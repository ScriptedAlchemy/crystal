import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionListItem } from '../../src/components/SessionListItem';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useNavigationStore } from '../../src/stores/navigationStore';
import { useContextMenu } from '../../src/contexts/ContextMenuContext';
import type { Session } from '../../src/types/session';

// Mock dependencies
vi.mock('../../src/stores/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

vi.mock('../../src/stores/navigationStore', () => ({
  useNavigationStore: vi.fn(() => ({
    navigateToSessions: vi.fn(),
  })),
}));

vi.mock('../../src/contexts/ContextMenuContext', () => ({
  useContextMenu: vi.fn(() => ({
    menuState: { position: null },
    openMenu: vi.fn(),
    closeMenu: vi.fn(),
    isMenuOpen: vi.fn(() => false),
  })),
}));

vi.mock('../../src/components/StatusIndicator', () => ({
  StatusIndicator: ({ session, size }: any) => (
    <div data-testid="status-indicator" data-status={session.status} data-size={size}>
      Status: {session.status}
    </div>
  ),
}));

vi.mock('../../src/components/GitStatusIndicator', () => ({
  GitStatusIndicator: ({ gitStatus, sessionId, isLoading }: any) => (
    <div data-testid="git-status-indicator" data-session-id={sessionId} data-loading={isLoading}>
      Git Status: {gitStatus?.summary || 'loading'}
    </div>
  ),
}));

vi.mock('../../src/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onConfirm, onClose, title, message }: any) => (
    isOpen ? (
      <div data-testid="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
        <button onClick={onClose} data-testid="cancel-button">Cancel</button>
      </div>
    ) : null
  ),
}));

describe('SessionListItem', () => {
  const mockSetActiveSession = vi.fn();
  const mockAddDeletingSessionId = vi.fn();
  const mockRemoveDeletingSessionId = vi.fn();
  const mockNavigateToSessions = vi.fn();
  const mockOpenMenu = vi.fn();
  const mockCloseMenu = vi.fn();

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session-1',
    name: 'Test Session',
    status: 'stopped',
    worktreePath: '/path/to/worktree',
    prompt: 'Test prompt',
    createdAt: '2024-01-01T00:00:00Z',
    projectId: 1,
    isMainRepo: false,
    isRunning: false,
    isFavorite: false,
    archived: false,
    autoCommit: true,
    model: 'claude-sonnet-4-20250514',
    commitMode: 'checkpoint',
    output: [],
    jsonMessages: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock subscribe function
    const mockSubscribe = vi.fn(() => vi.fn()); // Returns an unsubscribe function

    // Mock useSessionStore with subscribe method
    const createMockStore = (overrides = {}) => {
      const state = {
        activeSessionId: null,
        setActiveSession: mockSetActiveSession,
        deletingSessionIds: new Set(),
        addDeletingSessionId: mockAddDeletingSessionId,
        removeDeletingSessionId: mockRemoveDeletingSessionId,
        sessions: [],
        activeMainRepoSession: null,
        gitStatusLoading: new Set(),
        ...overrides,
      };
      
      return state;
    };

    (useSessionStore as any).mockImplementation((selector: any) => {
      const state = createMockStore();
      
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    });

    // Add subscribe method to the mock
    (useSessionStore as any).subscribe = mockSubscribe;

    // Mock useNavigationStore
    (useNavigationStore as any).mockReturnValue({
      navigateToSessions: mockNavigateToSessions,
    });

    // Mock useContextMenu
    (useContextMenu as any).mockReturnValue({
      menuState: { position: null },
      openMenu: mockOpenMenu,
      closeMenu: mockCloseMenu,
      isMenuOpen: vi.fn(() => false),
    });

    // Mock API responses
    (window as any).electronAPI = {
      sessions: {
        hasRunScript: vi.fn().mockResolvedValue({
          success: true,
          data: true,
        }),
        getRunningSession: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
        delete: vi.fn().mockResolvedValue({
          success: true,
        }),
        rename: vi.fn().mockResolvedValue({
          success: true,
        }),
        toggleFavorite: vi.fn().mockResolvedValue({
          success: true,
        }),
        runScript: vi.fn().mockResolvedValue({
          success: true,
        }),
        stopScript: vi.fn().mockResolvedValue({
          success: true,
        }),
      },
      invoke: vi.fn().mockResolvedValue({
        success: true,
        gitStatus: {
          summary: '2 files modified',
          hasChanges: true,
        },
      }),
      events: {
        onProjectUpdated: vi.fn(),
        onGitStatusUpdated: vi.fn(),
      },
    };

    // Mock window events
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Instead of deleting, set to undefined to avoid "Cannot delete property" error
    (window as any).electronAPI = undefined;
  });

  describe('Rendering', () => {
    it('renders session name and status', () => {
      const session = createMockSession({ name: 'My Test Session', status: 'running' });
      
      render(<SessionListItem session={session} />);
      
      expect(screen.getByText('My Test Session')).toBeDefined();
      expect(screen.getByTestId('status-indicator')).toBeDefined();
      expect(screen.getByTestId('status-indicator').getAttribute('data-status')).toBe('running');
    });

    it('shows main repo indicator', () => {
      const session = createMockSession({ isMainRepo: true });
      
      render(<SessionListItem session={session} />);
      
      expect(screen.getByText('(main)')).toBeDefined();
    });

    it('displays favorite star when session is favorite', () => {
      const session = createMockSession({ isFavorite: true });
      
      render(<SessionListItem session={session} />);
      
      const favoriteButton = screen.getByLabelText(/remove from favorites/i);
      expect(favoriteButton).toBeDefined();
    });

    it('shows git status indicator when available', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('git-status-indicator')).toBeDefined();
      });
    });

    it('applies active styling when session is active', () => {
      const session = createMockSession();
      
      const createMockStore = (overrides = {}) => {
        const state = {
          activeSessionId: 'session-1',
          setActiveSession: mockSetActiveSession,
          deletingSessionIds: new Set(),
          addDeletingSessionId: mockAddDeletingSessionId,
          removeDeletingSessionId: mockRemoveDeletingSessionId,
          sessions: [],
          activeMainRepoSession: null,
          gitStatusLoading: new Set(),
          ...overrides,
        };
        
        return state;
      };

      (useSessionStore as any).mockImplementation((selector: any) => {
        const state = createMockStore();
        
        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      const { container } = render(<SessionListItem session={session} />);
      
      const sessionElement = container.firstChild as HTMLElement;
      expect(sessionElement.className).toContain('bg-interactive/20');
    });
  });

  describe('Session Interaction', () => {
    it('activates session on click', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const sessionButton = screen.getByRole('button');
      await userEvent.click(sessionButton);
      
      expect(mockSetActiveSession).toHaveBeenCalledWith('session-1');
      expect(mockNavigateToSessions).toHaveBeenCalled();
    });

    it('opens context menu on right click', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const sessionElement = screen.getByRole('button').parentElement!;
      await userEvent.pointer({ target: sessionElement, keys: '[MouseRight]' });
      
      expect(mockOpenMenu).toHaveBeenCalledWith(
        'session',
        session,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
    });

    it('toggles favorite status', async () => {
      const session = createMockSession({ isFavorite: false });
      
      render(<SessionListItem session={session} />);
      
      const favoriteButton = screen.getByLabelText(/add to favorites/i);
      await userEvent.click(favoriteButton);
      
      expect((window as any).electronAPI.sessions.toggleFavorite).toHaveBeenCalledWith('session-1');
    });
  });

  describe('Session Editing', () => {
    it('enters edit mode on double click', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const nameElement = screen.getByText('Test Session');
      await userEvent.dblClick(nameElement);
      
      expect(screen.getByDisplayValue('Test Session')).toBeDefined();
    });

    it('saves name on enter key', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const nameElement = screen.getByText('Test Session');
      await userEvent.dblClick(nameElement);
      
      const input = screen.getByDisplayValue('Test Session');
      await userEvent.clear(input);
      await userEvent.type(input, 'New Session Name');
      await userEvent.keyboard('{Enter}');
      
      expect((window as any).electronAPI.sessions.rename).toHaveBeenCalledWith('session-1', 'New Session Name');
    });

    it('cancels edit on escape key', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const nameElement = screen.getByText('Test Session');
      await userEvent.dblClick(nameElement);
      
      const input = screen.getByDisplayValue('Test Session');
      await userEvent.clear(input);
      await userEvent.type(input, 'New Name');
      await userEvent.keyboard('{Escape}');
      
      expect(screen.getByText('Test Session')).toBeDefined();
      expect((window as any).electronAPI.sessions.rename).not.toHaveBeenCalled();
    });

    it('saves name on blur', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const nameElement = screen.getByText('Test Session');
      await userEvent.dblClick(nameElement);
      
      const input = screen.getByDisplayValue('Test Session');
      await userEvent.clear(input);
      await userEvent.type(input, 'Blurred Name');
      await userEvent.tab(); // This triggers blur
      
      expect((window as any).electronAPI.sessions.rename).toHaveBeenCalledWith('session-1', 'Blurred Name');
    });
  });

  describe('Script Management', () => {
    it('shows run button when script is available', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        const runButton = screen.getByTitle(/run script/i);
        expect(runButton).toBeDefined();
      });
    });

    it('shows no script message when script is not configured', async () => {
      (window as any).electronAPI.sessions.hasRunScript.mockResolvedValue({
        success: true,
        data: false,
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        const runButton = screen.getByTitle(/no run script configured/i);
        expect(runButton).toBeDefined();
      });
    });

    it('runs script when run button is clicked', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        const runButton = screen.getByTitle(/run script/i);
        expect(runButton).toBeDefined();
      });
      
      const runButton = screen.getByTitle(/run script/i);
      await userEvent.click(runButton);
      
      expect((window as any).electronAPI.sessions.runScript).toHaveBeenCalledWith('session-1');
    });

    it('stops script when stop button is clicked', async () => {
      (window as any).electronAPI.sessions.getRunningSession.mockResolvedValue({
        success: true,
        data: 'session-1',
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        const stopButton = screen.getByTitle(/stop script/i);
        expect(stopButton).toBeDefined();
      });
      
      const stopButton = screen.getByTitle(/stop script/i);
      await userEvent.click(stopButton);
      
      expect((window as any).electronAPI.sessions.stopScript).toHaveBeenCalled();
    });

    it('shows running state indicator', async () => {
      (window as any).electronAPI.sessions.getRunningSession.mockResolvedValue({
        success: true,
        data: 'session-1',
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        expect(screen.getByText('▶️ Running')).toBeDefined();
      });
    });
  });

  describe('Session Deletion', () => {
    it('shows archive confirmation dialog', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const archiveButton = screen.getByLabelText(/archive session/i);
      await userEvent.click(archiveButton);
      
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
      expect(screen.getByText('Archive Session')).toBeDefined();
    });

    it('archives session when confirmed', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const archiveButton = screen.getByLabelText(/archive session/i);
      await userEvent.click(archiveButton);
      
      const confirmButton = screen.getByTestId('confirm-button');
      await userEvent.click(confirmButton);
      
      expect((window as any).electronAPI.sessions.delete).toHaveBeenCalledWith('session-1');
    });

    it('cancels archive when dialog is closed', async () => {
      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const archiveButton = screen.getByLabelText(/archive session/i);
      await userEvent.click(archiveButton);
      
      const cancelButton = screen.getByTestId('cancel-button');
      await userEvent.click(cancelButton);
      
      expect((window as any).electronAPI.sessions.delete).not.toHaveBeenCalled();
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });

    it('shows deleting state during deletion', async () => {
      const createMockStore = (overrides = {}) => {
        const state = {
          activeSessionId: null,
          setActiveSession: mockSetActiveSession,
          deletingSessionIds: new Set(['session-1']),
          addDeletingSessionId: mockAddDeletingSessionId,
          removeDeletingSessionId: mockRemoveDeletingSessionId,
          sessions: [],
          activeMainRepoSession: null,
          gitStatusLoading: new Set(),
          ...overrides,
        };
        
        return state;
      };

      (useSessionStore as any).mockImplementation((selector: any) => {
        const state = createMockStore();
        
        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      expect(screen.getByText('⏳')).toBeDefined();
    });
  });

  describe('Context Menu', () => {
    it('shows context menu when position is set', () => {
      (useContextMenu as any).mockReturnValue({
        menuState: { position: { x: 100, y: 100 } },
        openMenu: mockOpenMenu,
        closeMenu: mockCloseMenu,
        isMenuOpen: vi.fn((type, id) => type === 'session' && id === 'session-1'),
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      expect(screen.getByText('Rename')).toBeDefined();
      expect(screen.getByText('Run Script')).toBeDefined();
      expect(screen.getByText('Archive')).toBeDefined();
    });

    it('handles rename from context menu', async () => {
      (useContextMenu as any).mockReturnValue({
        menuState: { position: { x: 100, y: 100 } },
        openMenu: mockOpenMenu,
        closeMenu: mockCloseMenu,
        isMenuOpen: vi.fn((type, id) => type === 'session' && id === 'session-1'),
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const renameButton = screen.getByText('Rename');
      await userEvent.click(renameButton);
      
      expect(mockCloseMenu).toHaveBeenCalled();
      expect(screen.getByDisplayValue('Test Session')).toBeDefined();
    });

    it('handles archive from context menu', async () => {
      (useContextMenu as any).mockReturnValue({
        menuState: { position: { x: 100, y: 100 } },
        openMenu: mockOpenMenu,
        closeMenu: mockCloseMenu,
        isMenuOpen: vi.fn((type, id) => type === 'session' && id === 'session-1'),
      });

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const archiveButton = screen.getByText('Archive');
      await userEvent.click(archiveButton);
      
      expect(mockCloseMenu).toHaveBeenCalled();
      expect(screen.getByTestId('confirm-dialog')).toBeDefined();
    });
  });

  describe('Status Variations', () => {
    it('shows completed_unviewed status with special styling', () => {
      const session = createMockSession({ status: 'completed_unviewed' });
      
      render(<SessionListItem session={session} />);
      
      const nameElement = screen.getByText('Test Session');
      expect(nameElement.className).toContain('text-interactive');
      expect(nameElement.className).toContain('font-semibold');
    });

    it('shows error status correctly', () => {
      const session = createMockSession({ status: 'error' });
      
      render(<SessionListItem session={session} />);
      
      expect(screen.getByTestId('status-indicator').getAttribute('data-status')).toBe('error');
    });

    it('shows running status correctly', () => {
      const session = createMockSession({ status: 'running' });
      
      render(<SessionListItem session={session} />);
      
      expect(screen.getByTestId('status-indicator').getAttribute('data-status')).toBe('running');
    });
  });

  describe('Nested Display', () => {
    it('applies nested styling when isNested is true', () => {
      const session = createMockSession();
      
      const { container } = render(<SessionListItem session={session} isNested={true} />);
      
      const sessionElement = container.firstChild as HTMLElement;
      expect(sessionElement.className).toContain('px-2');
      expect(sessionElement.className).toContain('py-1.5');
      expect(sessionElement.className).toContain('text-sm');
    });

    it('applies regular styling when isNested is false', () => {
      const session = createMockSession();
      
      const { container } = render(<SessionListItem session={session} isNested={false} />);
      
      const sessionElement = container.firstChild as HTMLElement;
      expect(sessionElement.className).toContain('px-3');
      expect(sessionElement.className).toContain('py-2');
    });
  });

  describe('Error Handling', () => {
    it('handles script run errors gracefully', async () => {
      (window as any).electronAPI.sessions.runScript.mockRejectedValue(new Error('Script failed'));
      
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      await waitFor(() => {
        const runButton = screen.getByTitle(/run script/i);
        expect(runButton).toBeDefined();
      });
      
      const runButton = screen.getByTitle(/run script/i);
      await userEvent.click(runButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to run script');
      });
      
      alertSpy.mockRestore();
    });

    it('handles rename errors gracefully', async () => {
      (window as any).electronAPI.sessions.rename.mockRejectedValue(new Error('Rename failed'));
      
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const nameElement = screen.getByText('Test Session');
      await userEvent.dblClick(nameElement);
      
      const input = screen.getByDisplayValue('Test Session');
      await userEvent.clear(input);
      await userEvent.type(input, 'New Name');
      await userEvent.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to rename session');
      });
      
      alertSpy.mockRestore();
    });

    it('handles archive errors gracefully', async () => {
      (window as any).electronAPI.sessions.delete.mockRejectedValue(new Error('Archive failed'));
      
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const session = createMockSession();
      
      render(<SessionListItem session={session} />);
      
      const archiveButton = screen.getByLabelText(/archive session/i);
      await userEvent.click(archiveButton);
      
      const confirmButton = screen.getByTestId('confirm-button');
      await userEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to archive session');
      });
      
      alertSpy.mockRestore();
    });
  });
});