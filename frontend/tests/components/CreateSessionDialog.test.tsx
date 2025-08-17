import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateSessionDialog } from '../../src/components/CreateSessionDialog';
import { useErrorStore } from '../../src/stores/errorStore';

// Mock the error store
vi.mock('../../src/stores/errorStore', () => ({
  useErrorStore: vi.fn(() => ({
    showError: vi.fn(),
  })),
}));

// Mock the FilePathAutocomplete component
vi.mock('../../src/components/FilePathAutocomplete', () => ({
  default: ({ value, onChange, placeholder, className, rows }: any) => (
    <textarea
      data-testid="file-path-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  ),
}));

// Mock the CommitModeSettings component
vi.mock('../../src/components/CommitModeSettings', () => ({
  CommitModeSettings: ({ mode, settings, onChange }: any) => (
    <div data-testid="commit-mode-settings">
      <select
        data-testid="commit-mode-select"
        value={mode}
        onChange={(e) => onChange(e.target.value, { ...settings, mode: e.target.value })}
      >
        <option value="disabled">Disabled</option>
        <option value="checkpoint">Checkpoint</option>
        <option value="final">Final</option>
      </select>
    </div>
  ),
}));

describe('CreateSessionDialog', () => {
  const mockShowError = vi.fn();
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    projectName: 'Test Project',
    projectId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useErrorStore
    (useErrorStore as any).mockReturnValue({
      showError: mockShowError,
    });

    // Mock API responses
    (window as any).electronAPI = {
      config: {
        get: vi.fn().mockResolvedValue({
          success: true,
          data: {
            defaultPermissionMode: 'ignore',
            anthropicApiKey: 'test-api-key',
          },
        }),
      },
      projects: {
        getAll: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { id: 1, name: 'Test Project', lastUsedModel: 'claude-sonnet-4-20250514' },
          ],
        }),
        listBranches: vi.fn().mockResolvedValue({
          success: true,
          data: [
            { name: 'main', isCurrent: true, hasWorktree: false },
            { name: 'feature-1', isCurrent: false, hasWorktree: true },
          ],
        }),
        detectBranch: vi.fn().mockResolvedValue({
          success: true,
          data: 'main',
        }),
        update: vi.fn().mockResolvedValue({
          success: true,
        }),
      },
      sessions: {
        generateName: vi.fn().mockResolvedValue({
          success: true,
          data: 'generated-session-name',
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: { id: 'session-1' },
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  describe('Rendering', () => {
    it('renders the dialog when open', () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      expect(screen.getByText('Create New Session in Test Project')).toBeDefined();
      expect(screen.getByText('What would you like to work on?')).toBeDefined();
      expect(screen.getByTestId('file-path-autocomplete')).toBeDefined();
    });

    it('does not render when closed', () => {
      render(<CreateSessionDialog {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Create New Session in Test Project')).toBeNull();
    });

    it('shows model selection cards', () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      expect(screen.getByText('Sonnet')).toBeDefined();
      expect(screen.getByText('Opus')).toBeDefined();
      expect(screen.getByText('Haiku')).toBeDefined();
    });

    it('displays session name field with correct labels', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Session Name (Optional)')).toBeDefined();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty prompt', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      expect(createButton.hasAttribute('disabled')).toBe(true);
    });

    it('validates session name characters', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      const sessionNameInput = screen.getByPlaceholderText(/leave empty for ai-generated name/i);
      
      await userEvent.type(promptInput, 'Test prompt');
      await userEvent.type(sessionNameInput, 'invalid session name'); // Contains spaces
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      expect(mockShowError).toHaveBeenCalledWith({
        title: 'Invalid Session Name',
        error: 'Session name cannot contain spaces',
      });
    });

    it('validates session name for invalid characters', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      const sessionNameInput = screen.getByPlaceholderText(/leave empty for ai-generated name/i);
      
      await userEvent.type(promptInput, 'Test prompt');
      await userEvent.type(sessionNameInput, 'test:name'); // Contains invalid character
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      expect(mockShowError).toHaveBeenCalledWith({
        title: 'Invalid Session Name',
        error: 'Session name contains invalid characters (~^:?*[]\\)',
      });
    });

    it('requires session name when no API key is present', async () => {
      (window as any).electronAPI.config.get.mockResolvedValue({
        success: true,
        data: {
          defaultPermissionMode: 'ignore',
          anthropicApiKey: null,
        },
      });

      render(<CreateSessionDialog {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Session Name (Required)')).toBeDefined();
      });
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      expect(mockShowError).toHaveBeenCalledWith({
        title: 'Session Name Required',
        error: 'Please provide a session name or add an Anthropic API key in Settings to enable auto-naming.',
      });
    });
  });

  describe('Model Selection', () => {
    it('selects Sonnet by default', () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const sonnetCard = screen.getByText('Sonnet').closest('div');
      expect(sonnetCard?.className).toContain('border-interactive');
    });

    it('allows switching between models', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const opusCard = screen.getByText('Opus').closest('div');
      await userEvent.click(opusCard!);
      
      expect(opusCard?.className).toContain('border-interactive');
      
      const sonnetCard = screen.getByText('Sonnet').closest('div');
      expect(sonnetCard?.className).not.toContain('border-interactive');
    });

    it('loads last used model from project', async () => {
      (window as any).electronAPI.projects.getAll.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: 'Test Project', lastUsedModel: 'claude-opus-4-20250514' },
        ],
      });

      render(<CreateSessionDialog {...defaultProps} />);
      
      await waitFor(() => {
        const opusCard = screen.getByText('Opus').closest('div');
        expect(opusCard?.className).toContain('border-interactive');
      });
    });
  });

  describe('AI Name Generation', () => {
    it('shows generate button when API key is available', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeDefined();
      });
    });

    it('generates session name from prompt', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Add user authentication');
      
      const generateButton = await screen.findByRole('button', { name: /generate/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.generateName).toHaveBeenCalledWith('Add user authentication');
      });
      
      const sessionNameInput = screen.getByDisplayValue('generated-session-name');
      expect(sessionNameInput).toBeDefined();
    });

    it('handles generation errors gracefully', async () => {
      (window as any).electronAPI.sessions.generateName.mockRejectedValue(new Error('Generation failed'));

      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      const generateButton = await screen.findByRole('button', { name: /generate/i });
      await userEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith({
          title: 'Failed to Generate Name',
          error: 'An error occurred while generating the name',
        });
      });
    });
  });

  describe('Advanced Options', () => {
    it('shows advanced options when toggled', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const moreOptionsButton = screen.getByRole('button', { name: /more options/i });
      await userEvent.click(moreOptionsButton);
      
      expect(screen.getByText('Base Branch')).toBeDefined();
      expect(screen.getByText('Permission Mode')).toBeDefined();
    });

    it('displays branch selection when available', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const moreOptionsButton = screen.getByRole('button', { name: /more options/i });
      await userEvent.click(moreOptionsButton);
      
      await waitFor(() => {
        const branchSelect = screen.getByDisplayValue('main');
        expect(branchSelect).toBeDefined();
        expect(screen.getByText('feature-1')).toBeDefined();
      });
    });

    it('allows permission mode selection', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const moreOptionsButton = screen.getByRole('button', { name: /more options/i });
      await userEvent.click(moreOptionsButton);
      
      const manualApprovalRadio = screen.getByLabelText(/manual approval/i);
      await userEvent.click(manualApprovalRadio);
      
      expect((manualApprovalRadio as HTMLInputElement).checked).toBe(true);
    });

    it('toggles ultrathink mode', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const moreOptionsButton = screen.getByRole('button', { name: /more options/i });
      await userEvent.click(moreOptionsButton);
      
      const ultrathinkCheckbox = screen.getByLabelText(/enable ultrathink mode/i);
      await userEvent.click(ultrathinkCheckbox);
      
      expect((ultrathinkCheckbox as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('Session Creation', () => {
    it('creates session with basic options', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Add user authentication');
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.create).toHaveBeenCalledWith({
          prompt: 'Add user authentication',
          worktreeTemplate: '',
          count: 1,
          permissionMode: 'ignore',
          model: 'claude-sonnet-4-20250514',
          projectId: 1,
          autoCommit: true,
          commitMode: 'checkpoint',
          commitModeSettings: JSON.stringify({
            mode: 'checkpoint',
            checkpointPrefix: 'checkpoint: ',
          }),
        });
      });
    });

    it('creates session with ultrathink enabled', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Complex task');
      
      const moreOptionsButton = screen.getByRole('button', { name: /more options/i });
      await userEvent.click(moreOptionsButton);
      
      const ultrathinkCheckbox = screen.getByLabelText(/enable ultrathink mode/i);
      await userEvent.click(ultrathinkCheckbox);
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: 'Complex task\nultrathink',
          })
        );
      });
    });

    it('creates multiple sessions when count is increased', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      const countSlider = screen.getByRole('slider');
      fireEvent.change(countSlider, { target: { value: '3' } });
      
      const createButton = screen.getByRole('button', { name: /create 3 sessions/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            count: 3,
          })
        );
      });
    });

    it('handles creation errors', async () => {
      (window as any).electronAPI.sessions.create.mockResolvedValue({
        success: false,
        error: 'Creation failed',
        details: 'Detailed error message',
      });

      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith({
          title: 'Failed to Create Session',
          error: 'Creation failed',
          details: 'Detailed error message',
          command: undefined,
        });
      });
    });

    it('saves last used model after successful creation', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const opusCard = screen.getByText('Opus').closest('div');
      await userEvent.click(opusCard!);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.projects.update).toHaveBeenCalledWith('1', {
          lastUsedModel: 'claude-opus-4-20250514',
        });
      });
    });

    it('closes dialog after successful creation', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      const createButton = screen.getByRole('button', { name: /create session/i });
      await userEvent.click(createButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('submits form with Cmd+Enter', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.create).toHaveBeenCalled();
      });
    });

    it('submits form with Ctrl+Enter', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      await userEvent.type(promptInput, 'Test prompt');
      
      await userEvent.keyboard('{Control>}{Enter}{/Control}');
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.create).toHaveBeenCalled();
      });
    });
  });

  describe('Dialog Management', () => {
    it('closes when cancel button is clicked', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form when closed', () => {
      const { rerender } = render(<CreateSessionDialog {...defaultProps} />);
      
      rerender(<CreateSessionDialog {...defaultProps} isOpen={false} />);
      rerender(<CreateSessionDialog {...defaultProps} isOpen={true} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      expect((promptInput as HTMLTextAreaElement).value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles', () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('shows proper validation messages', async () => {
      render(<CreateSessionDialog {...defaultProps} />);
      
      const promptInput = screen.getByTestId('file-path-autocomplete');
      const sessionNameInput = screen.getByPlaceholderText(/leave empty for ai-generated name/i);
      
      await userEvent.type(promptInput, 'Test');
      await userEvent.type(sessionNameInput, 'invalid name');
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/session name cannot contain spaces/i);
        expect(errorMessage).toBeDefined();
      });
    });
  });
});