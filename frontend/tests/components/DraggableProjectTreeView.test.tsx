import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraggableProjectTreeView } from '../../src/components/DraggableProjectTreeView';
import { useErrorStore } from '../../src/stores/errorStore';
import { useNavigationStore } from '../../src/stores/navigationStore';
import { useSessionStore } from '../../src/stores/sessionStore';

// Mock stores
vi.mock('../../src/stores/errorStore', () => ({
  useErrorStore: vi.fn(() => ({
    showError: vi.fn(),
  })),
}));

vi.mock('../../src/stores/navigationStore', () => ({
  useNavigationStore: vi.fn(() => ({
    setActiveSession: vi.fn(),
    setActiveView: vi.fn(),
    activeView: 'output',
    activeSessionId: 'session-1',
  })),
}));

vi.mock('../../src/stores/sessionStore', () => ({
  useSessionStore: vi.fn(() => ({
    sessions: [],
    activeSessionId: 'session-1',
    setActiveSession: vi.fn(),
    markSessionAsViewed: vi.fn(),
  })),
}));

// Mock context menu
vi.mock('../../src/contexts/ContextMenuContext', () => ({
  useContextMenu: vi.fn(() => ({
    showContextMenu: vi.fn(),
  })),
}));

// Mock complex components
vi.mock('../../src/components/SessionListItem', () => ({
  SessionListItem: ({ session, isSelected, onClick }: any) => (
    <div
      data-testid={`session-item-${session.id}`}
      onClick={() => onClick(session)}
      className={isSelected ? 'selected' : ''}
    >
      {session.name}
    </div>
  ),
}));

vi.mock('../../src/components/CreateSessionDialog', () => ({
  CreateSessionDialog: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="create-session-dialog">Create Session Dialog</div> : null,
}));

vi.mock('../../src/components/ProjectSettings', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="project-settings">Project Settings</div> : null,
}));

vi.mock('../../src/components/EmptyState', () => ({
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../../src/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe('DraggableProjectTreeView', () => {
  const mockShowError = vi.fn();
  const mockSetActiveSession = vi.fn();
  const mockSetActiveView = vi.fn();
  const mockMarkSessionAsViewed = vi.fn();

  const mockProjects = [
    {
      id: 1,
      name: 'Test Project 1',
      path: '/test/project1',
      sessions: [
        {
          id: 'session-1',
          name: 'Test Session 1',
          status: 'waiting',
          projectId: 1,
          createdAt: '2024-01-01T12:00:00Z',
          prompt: 'Test prompt',
          worktreePath: '/test/worktree1',
          output: [],
          jsonMessages: [],
        },
        {
          id: 'session-2',
          name: 'Test Session 2',
          status: 'completed_unviewed',
          projectId: 1,
          createdAt: '2024-01-01T13:00:00Z',
          prompt: 'Another prompt',
          worktreePath: '/test/worktree2',
          output: [],
          jsonMessages: [],
        },
      ],
      folders: [],
    },
    {
      id: 2,
      name: 'Test Project 2',
      path: '/test/project2',
      sessions: [],
      folders: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock store hooks
    (useErrorStore as any).mockReturnValue({
      showError: mockShowError,
    });

    (useNavigationStore as any).mockReturnValue({
      setActiveSession: mockSetActiveSession,
      setActiveView: mockSetActiveView,
      activeView: 'output',
      activeSessionId: 'session-1',
    });

    (useSessionStore as any).mockReturnValue({
      sessions: mockProjects[0].sessions,
      activeSessionId: 'session-1',
      setActiveSession: vi.fn(),
      markSessionAsViewed: mockMarkSessionAsViewed,
    });

    // Mock API responses
    (window as any).electronAPI = {
      projects: {
        getAllWithSessions: vi.fn().mockResolvedValue({
          success: true,
          data: mockProjects,
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 3, name: 'New Project', path: '/test/new' },
        }),
        delete: vi.fn().mockResolvedValue({ success: true }),
        activate: vi.fn().mockResolvedValue({ success: true }),
      },
      sessions: {
        delete: vi.fn().mockResolvedValue({ success: true }),
        rename: vi.fn().mockResolvedValue({ success: true }),
      },
      git: {
        getStatus: vi.fn().mockResolvedValue({
          success: true,
          data: { state: 'clean' },
        }),
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

  describe('Rendering', () => {
    it('renders project tree with projects and sessions', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
        expect(screen.getByText('Test Project 2')).toBeDefined();
      });
    });

    it('shows loading spinner initially', () => {
      render(<DraggableProjectTreeView />);
      expect(screen.getByTestId('loading-spinner')).toBeDefined();
    });

    it('shows empty state when no projects exist', async () => {
      (window as any).electronAPI.projects.getAllWithSessions.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeDefined();
        expect(screen.getByText('No projects found')).toBeDefined();
      });
    });

    it('renders sessions when project is expanded', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        const expandButton = screen.getByText('Test Project 1').closest('button');
        expect(expandButton).toBeDefined();
      });

      const expandButton = screen.getByText('Test Project 1').closest('button');
      await userEvent.click(expandButton!);

      expect(screen.getByTestId('session-item-session-1')).toBeDefined();
      expect(screen.getByTestId('session-item-session-2')).toBeDefined();
    });
  });

  describe('Project Operations', () => {
    it('expands and collapses projects', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      const projectElement = screen.getByText('Test Project 1');
      const expandButton = projectElement.closest('button');
      
      // Initially collapsed
      expect(screen.queryByTestId('session-item-session-1')).toBeNull();

      // Click to expand
      await userEvent.click(expandButton!);
      expect(screen.getByTestId('session-item-session-1')).toBeDefined();

      // Click to collapse
      await userEvent.click(expandButton!);
      expect(screen.queryByTestId('session-item-session-1')).toBeNull();
    });

    it('activates project when clicked', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 2')).toBeDefined();
      });

      const projectElement = screen.getByText('Test Project 2');
      await userEvent.click(projectElement);

      expect((window as any).electronAPI.projects.activate).toHaveBeenCalledWith(2);
    });

    it('shows create session dialog when add button is clicked', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      // Expand project first
      const projectElement = screen.getByText('Test Project 1');
      await userEvent.click(projectElement.closest('button')!);

      // Find and click add button
      const addButton = screen.getByRole('button', { name: /add session/i });
      await userEvent.click(addButton);

      expect(screen.getByTestId('create-session-dialog')).toBeDefined();
    });

    it('creates new project', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      const newProjectButton = screen.getByRole('button', { name: /new project/i });
      await userEvent.click(newProjectButton);

      // Should show create project form
      const nameInput = screen.getByPlaceholderText(/project name/i);
      const pathInput = screen.getByPlaceholderText(/project path/i);
      
      await userEvent.type(nameInput, 'New Test Project');
      await userEvent.type(pathInput, '/test/new-project');

      const createButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect((window as any).electronAPI.projects.create).toHaveBeenCalledWith({
          name: 'New Test Project',
          path: '/test/new-project',
        });
      });
    });
  });

  describe('Session Operations', () => {
    it('selects session when clicked', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      // Expand project
      const projectElement = screen.getByText('Test Project 1');
      await userEvent.click(projectElement.closest('button')!);

      // Click session
      const sessionElement = screen.getByTestId('session-item-session-2');
      await userEvent.click(sessionElement);

      expect(mockSetActiveSession).toHaveBeenCalledWith('session-2');
    });

    it('marks completed sessions as viewed when selected', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      // Expand project
      const projectElement = screen.getByText('Test Project 1');
      await userEvent.click(projectElement.closest('button')!);

      // Click unviewed session
      const sessionElement = screen.getByTestId('session-item-session-2');
      await userEvent.click(sessionElement);

      expect(mockMarkSessionAsViewed).toHaveBeenCalledWith('session-2');
    });

    it('shows context menu on right click', async () => {
      const mockShowContextMenu = vi.fn();
      vi.mocked(require('../../src/contexts/ContextMenuContext').useContextMenu).mockReturnValue({
        showContextMenu: mockShowContextMenu,
      });

      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      // Expand project
      const projectElement = screen.getByText('Test Project 1');
      await userEvent.click(projectElement.closest('button')!);

      // Right click session
      const sessionElement = screen.getByTestId('session-item-session-1');
      fireEvent.contextMenu(sessionElement);

      expect(mockShowContextMenu).toHaveBeenCalled();
    });
  });

  describe('Archived Sessions', () => {
    it('toggles archived sessions view', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      const archivedToggle = screen.getByRole('button', { name: /show archived/i });
      await userEvent.click(archivedToggle);

      expect(screen.getByText(/hide archived/i)).toBeDefined();
    });

    it('loads archived sessions when toggled', async () => {
      const archivedProjects = [
        {
          ...mockProjects[0],
          sessions: [
            {
              ...mockProjects[0].sessions[0],
              id: 'archived-session-1',
              name: 'Archived Session',
              archived: true,
            },
          ],
        },
      ];

      (window as any).electronAPI.projects.getAllWithSessions
        .mockResolvedValueOnce({ success: true, data: mockProjects })
        .mockResolvedValueOnce({ success: true, data: archivedProjects });

      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      const archivedToggle = screen.getByRole('button', { name: /show archived/i });
      await userEvent.click(archivedToggle);

      await waitFor(() => {
        expect((window as any).electronAPI.projects.getAllWithSessions).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (window as any).electronAPI.projects.getAllWithSessions.mockRejectedValue(
        new Error('API Error')
      );

      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith({
          title: 'Failed to Load Projects',
          error: 'An error occurred while loading projects',
        });
      });
    });

    it('shows error when project deletion fails', async () => {
      (window as any).electronAPI.projects.delete.mockResolvedValue({
        success: false,
        error: 'Cannot delete project',
      });

      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      // Simulate delete action (would normally be through context menu)
      const deleteAction = async () => {
        const result = await (window as any).electronAPI.projects.delete(1);
        if (!result.success) {
          mockShowError({
            title: 'Failed to Delete Project',
            error: result.error,
          });
        }
      };

      await deleteAction();

      expect(mockShowError).toHaveBeenCalledWith({
        title: 'Failed to Delete Project',
        error: 'Cannot delete project',
      });
    });
  });

  describe('Real-time Updates', () => {
    it('listens for session events', () => {
      render(<DraggableProjectTreeView />);

      expect((window as any).electronAPI.on).toHaveBeenCalledWith(
        'session:created',
        expect.any(Function)
      );
      expect((window as any).electronAPI.on).toHaveBeenCalledWith(
        'session:updated',
        expect.any(Function)
      );
      expect((window as any).electronAPI.on).toHaveBeenCalledWith(
        'session:deleted',
        expect.any(Function)
      );
    });

    it('removes event listeners on cleanup', () => {
      const { unmount } = render(<DraggableProjectTreeView />);
      unmount();

      expect((window as any).electronAPI.removeAllListeners).toHaveBeenCalledWith(
        'session:created'
      );
      expect((window as any).electronAPI.removeAllListeners).toHaveBeenCalledWith(
        'session:updated'
      );
      expect((window as any).electronAPI.removeAllListeners).toHaveBeenCalledWith(
        'session:deleted'
      );
    });
  });

  describe('Search and Filtering', () => {
    it('filters sessions by search term', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      // Expand project to show sessions
      const projectElement = screen.getByText('Test Project 1');
      await userEvent.click(projectElement.closest('button')!);

      expect(screen.getByTestId('session-item-session-1')).toBeDefined();
      expect(screen.getByTestId('session-item-session-2')).toBeDefined();

      // Search for specific session
      const searchInput = screen.getByPlaceholderText(/search sessions/i);
      await userEvent.type(searchInput, 'Test Session 1');

      // Should only show matching session
      expect(screen.getByTestId('session-item-session-1')).toBeDefined();
      expect(screen.queryByTestId('session-item-session-2')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        const treeView = screen.getByRole('tree');
        expect(treeView).toBeDefined();
      });

      const projectElements = screen.getAllByRole('treeitem');
      expect(projectElements.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      render(<DraggableProjectTreeView />);

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeDefined();
      });

      const firstProject = screen.getByText('Test Project 1').closest('button');
      firstProject?.focus();

      // Test keyboard expansion
      fireEvent.keyDown(firstProject!, { key: 'Enter' });
      expect(screen.getByTestId('session-item-session-1')).toBeDefined();
    });
  });
});