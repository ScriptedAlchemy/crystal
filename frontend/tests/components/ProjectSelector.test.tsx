import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectSelector from '../../src/components/ProjectSelector';
import { useErrorStore } from '../../src/stores/errorStore';
import type { Project } from '../../src/types/project';

// Mock dependencies
vi.mock('../../src/stores/errorStore', () => ({
  useErrorStore: vi.fn(() => ({
    showError: vi.fn(),
  })),
}));

vi.mock('../../src/components/ProjectSettings', () => ({
  default: ({ project, isOpen, onClose, onUpdate, onDelete }: any) => (
    isOpen ? (
      <div data-testid="project-settings">
        <h3>Settings for {project.name}</h3>
        <button onClick={onUpdate} data-testid="update-project">Update</button>
        <button onClick={onDelete} data-testid="delete-project">Delete</button>
        <button onClick={onClose} data-testid="close-settings">Close</button>
      </div>
    ) : null
  ),
}));

describe('ProjectSelector', () => {
  const mockShowError = vi.fn();
  const mockOnProjectChange = vi.fn();

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Test Project',
    path: '/path/to/project',
    active: false,
    build_script: 'npm run build',
    run_script: 'npm run dev',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const defaultProps = {
    onProjectChange: mockOnProjectChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useErrorStore
    (useErrorStore as any).mockReturnValue({
      showError: mockShowError,
    });

    // Mock API responses
    (window as any).electronAPI = {
      projects: {
        getAll: vi.fn().mockResolvedValue({
          success: true,
          data: [
            createMockProject({ id: 1, name: 'Project One', active: true }),
            createMockProject({ id: 2, name: 'Project Two', active: false }),
          ],
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: createMockProject({ id: 3, name: 'New Project' }),
        }),
        activate: vi.fn().mockResolvedValue({
          success: true,
        }),
        detectBranch: vi.fn().mockResolvedValue({
          success: true,
          data: 'main',
        }),
      },
      dialog: {
        openDirectory: vi.fn().mockResolvedValue({
          success: true,
          data: '/selected/directory',
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  describe('Rendering', () => {
    it('renders project selector button', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('project-selector')).toBeDefined();
      });
    });

    it('displays active project name', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Project One')).toBeDefined();
      });
    });

    it('shows select project when no active project', async () => {
      (window as any).electronAPI.projects.getAll.mockResolvedValue({
        success: true,
        data: [
          createMockProject({ id: 1, name: 'Project One', active: false }),
          createMockProject({ id: 2, name: 'Project Two', active: false }),
        ],
      });

      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeDefined();
      });
    });

    it('shows settings button when active project exists', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Project Settings')).toBeDefined();
      });
    });
  });

  describe('Project Dropdown', () => {
    it('opens dropdown when selector is clicked', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('project-selector')).toBeDefined();
      });
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      expect(screen.getByText('Project One')).toBeDefined();
      expect(screen.getByText('Project Two')).toBeDefined();
      expect(screen.getByText('Add Project')).toBeDefined();
    });

    it('displays project paths in dropdown', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      await waitFor(() => {
        expect(screen.getByText('/path/to/project')).toBeDefined();
      });
    });

    it('shows active indicator for current project', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      await waitFor(() => {
        // Check for checkmark icon next to active project
        const activeProject = screen.getByText('Project One').closest('div');
        expect(activeProject?.querySelector('svg')).toBeDefined(); // Check icon exists
      });
    });

    it('shows settings button for each project on hover', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      await waitFor(() => {
        const settingsButtons = screen.getAllByLabelText('Project Settings');
        expect(settingsButtons.length).toBeGreaterThan(1); // Multiple settings buttons
      });
    });
  });

  describe('Project Selection', () => {
    it('activates project when clicked', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const projectTwo = screen.getByText('Project Two');
      await userEvent.click(projectTwo);
      
      expect((window as any).electronAPI.projects.activate).toHaveBeenCalledWith('2');
    });

    it('calls onProjectChange when project is activated', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const projectTwo = screen.getByText('Project Two');
      await userEvent.click(projectTwo);
      
      await waitFor(() => {
        expect(mockOnProjectChange).toHaveBeenCalledWith(
          expect.objectContaining({ id: 2, name: 'Project Two' })
        );
      });
    });

    it('updates local state when project is activated', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const projectTwo = screen.getByText('Project Two');
      await userEvent.click(projectTwo);
      
      await waitFor(() => {
        expect(screen.getByText('Project Two')).toBeDefined();
      });
    });

    it('handles activation errors gracefully', async () => {
      (window as any).electronAPI.projects.activate.mockRejectedValue(new Error('Activation failed'));

      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const projectTwo = screen.getByText('Project Two');
      await userEvent.click(projectTwo);
      
      // Should not crash and project should not change
      await waitFor(() => {
        expect(screen.getByText('Project One')).toBeDefined(); // Still showing original
      });
    });
  });

  describe('Project Creation', () => {
    it('opens create dialog when Add Project is clicked', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      expect(screen.getByText('Add New Project')).toBeDefined();
      expect(screen.getByText('Project Information')).toBeDefined();
    });

    it('shows required fields in create dialog', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      expect(screen.getByText('Project Name')).toBeDefined();
      expect(screen.getByText('Repository Path')).toBeDefined();
      expect(screen.getByPlaceholderText('Enter project name')).toBeDefined();
      expect(screen.getByPlaceholderText('/path/to/your/repository')).toBeDefined();
    });

    it('validates required fields', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const createButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(createButton);
      
      // Button should be disabled when required fields are empty
      expect(createButton.hasAttribute('disabled')).toBe(true);
    });

    it('detects git branch when path is entered', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const pathInput = screen.getByPlaceholderText('/path/to/your/repository');
      await userEvent.type(pathInput, '/test/repo');
      
      await waitFor(() => {
        expect((window as any).electronAPI.projects.detectBranch).toHaveBeenCalledWith('/test/repo');
      });
      
      await waitFor(() => {
        expect(screen.getByText('main')).toBeDefined();
      });
    });

    it('opens directory browser when Browse is clicked', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const browseButton = screen.getByText('Browse');
      await userEvent.click(browseButton);
      
      expect((window as any).electronAPI.dialog.openDirectory).toHaveBeenCalledWith({
        title: 'Select Repository Directory',
        buttonLabel: 'Select',
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('/selected/directory')).toBeDefined();
      });
    });

    it('creates project with filled data', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const nameInput = screen.getByPlaceholderText('Enter project name');
      const pathInput = screen.getByPlaceholderText('/path/to/your/repository');
      const buildScriptInput = screen.getByPlaceholderText('pnpm build');
      const runScriptInput = screen.getByPlaceholderText('pnpm dev');
      
      await userEvent.type(nameInput, 'My New Project');
      await userEvent.type(pathInput, '/my/project/path');
      await userEvent.type(buildScriptInput, 'npm run build');
      await userEvent.type(runScriptInput, 'npm start');
      
      const createButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(createButton);
      
      expect((window as any).electronAPI.projects.create).toHaveBeenCalledWith({
        name: 'My New Project',
        path: '/my/project/path',
        buildScript: 'npm run build',
        runScript: 'npm start',
      });
    });

    it('auto-activates newly created project', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const nameInput = screen.getByPlaceholderText('Enter project name');
      const pathInput = screen.getByPlaceholderText('/path/to/your/repository');
      
      await userEvent.type(nameInput, 'Auto Activate Project');
      await userEvent.type(pathInput, '/auto/path');
      
      const createButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.projects.activate).toHaveBeenCalledWith('3');
      });
    });

    it('handles creation errors', async () => {
      (window as any).electronAPI.projects.create.mockResolvedValue({
        success: false,
        error: 'Project creation failed',
        details: 'Directory does not exist',
      });

      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const nameInput = screen.getByPlaceholderText('Enter project name');
      const pathInput = screen.getByPlaceholderText('/path/to/your/repository');
      
      await userEvent.type(nameInput, 'Failed Project');
      await userEvent.type(pathInput, '/invalid/path');
      
      const createButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith({
          title: 'Failed to Create Project',
          error: 'Project creation failed',
          details: 'Directory does not exist',
          command: undefined,
        });
      });
    });

    it('closes dialog and resets form on cancel', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const nameInput = screen.getByPlaceholderText('Enter project name');
      await userEvent.type(nameInput, 'Test Input');
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(screen.queryByText('Add New Project')).toBeNull();
      
      // Reopen to check form was reset
      await userEvent.click(selector);
      await userEvent.click(screen.getByText('Add Project'));
      
      const newNameInput = screen.getByPlaceholderText('Enter project name');
      expect((newNameInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('Project Settings', () => {
    it('opens settings when settings button is clicked', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Project Settings')).toBeDefined();
      });
      
      const settingsButton = screen.getByLabelText('Project Settings');
      await userEvent.click(settingsButton);
      
      expect(screen.getByTestId('project-settings')).toBeDefined();
      expect(screen.getByText('Settings for Project One')).toBeDefined();
    });

    it('opens settings from dropdown menu', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const settingsButtons = screen.getAllByLabelText('Project Settings');
      await userEvent.click(settingsButtons[1]); // Second project's settings
      
      expect(screen.getByTestId('project-settings')).toBeDefined();
    });

    it('refreshes projects when settings are updated', async () => {
      const fetchAllSpy = vi.spyOn((window as any).electronAPI.projects, 'getAll');

      render(<ProjectSelector {...defaultProps} />);
      
      const settingsButton = screen.getByLabelText('Project Settings');
      await userEvent.click(settingsButton);
      
      const updateButton = screen.getByTestId('update-project');
      await userEvent.click(updateButton);
      
      // Should refetch projects after update
      expect(fetchAllSpy).toHaveBeenCalledTimes(2); // Initial load + refresh
    });

    it('handles project deletion', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const settingsButton = screen.getByLabelText('Project Settings');
      await userEvent.click(settingsButton);
      
      const deleteButton = screen.getByTestId('delete-project');
      await userEvent.click(deleteButton);
      
      // Active project should be cleared
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeDefined();
      });
    });

    it('closes settings dialog', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const settingsButton = screen.getByLabelText('Project Settings');
      await userEvent.click(settingsButton);
      
      const closeButton = screen.getByTestId('close-settings');
      await userEvent.click(closeButton);
      
      expect(screen.queryByTestId('project-settings')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles fetch errors gracefully', async () => {
      (window as any).electronAPI.projects.getAll.mockRejectedValue(new Error('Network error'));

      render(<ProjectSelector {...defaultProps} />);
      
      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeDefined();
      });
    });

    it('handles branch detection failures silently', async () => {
      (window as any).electronAPI.projects.detectBranch.mockRejectedValue(new Error('Git not found'));

      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const pathInput = screen.getByPlaceholderText('/path/to/your/repository');
      await userEvent.type(pathInput, '/no/git/repo');
      
      // Should not show any error to user, but should continue working
      await waitFor(() => {
        expect(screen.getByPlaceholderText('/path/to/your/repository')).toBeDefined();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('project-selector')).toBeDefined();
        expect(screen.getByLabelText('Project Settings')).toBeDefined();
      });
    });

    it('supports keyboard navigation', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      selector.focus();
      
      expect(document.activeElement).toBe(selector);
      
      // Space or Enter should open dropdown
      await userEvent.keyboard(' ');
      
      expect(screen.getByText('Add Project')).toBeDefined();
    });

    it('shows validation indicators', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const createButton = screen.getByRole('button', { name: /create project/i });
      
      // Should have visual indication when disabled
      expect(createButton.hasAttribute('disabled')).toBe(true);
      expect(createButton.className).toContain('border-status-error');
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors when fields are empty', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      // Try to create without filling required fields
      const createButton = screen.getByRole('button', { name: /create project/i });
      await userEvent.click(createButton);
      
      expect(createButton.hasAttribute('disabled')).toBe(true);
    });

    it('enables create button when required fields are filled', async () => {
      render(<ProjectSelector {...defaultProps} />);
      
      const selector = screen.getByTestId('project-selector');
      await userEvent.click(selector);
      
      const addButton = screen.getByText('Add Project');
      await userEvent.click(addButton);
      
      const nameInput = screen.getByPlaceholderText('Enter project name');
      const pathInput = screen.getByPlaceholderText('/path/to/your/repository');
      
      await userEvent.type(nameInput, 'Valid Project');
      await userEvent.type(pathInput, '/valid/path');
      
      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton.hasAttribute('disabled')).toBe(false);
    });
  });
});