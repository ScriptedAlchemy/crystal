import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionInput } from '../../src/components/session/SessionInput';
import type { Session } from '../../src/types/session';
import type { ViewMode } from '../../src/hooks/useSessionView';

describe('SessionInput', () => {
  const mockSetInput = vi.fn();
  const mockHandleTerminalCommand = vi.fn();
  const mockHandleSendInput = vi.fn();
  const mockHandleContinueConversation = vi.fn();
  const mockSetShowStravuSearch = vi.fn();
  const mockSetUltrathink = vi.fn();
  const mockHandleToggleAutoCommit = vi.fn();

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session-1',
    name: 'Test Session',
    status: 'waiting',
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

  const defaultProps = {
    activeSession: createMockSession(),
    viewMode: 'richOutput' as ViewMode,
    input: 'Test input',
    setInput: mockSetInput,
    textareaRef: { current: null },
    handleTerminalCommand: mockHandleTerminalCommand,
    handleSendInput: mockHandleSendInput,
    handleContinueConversation: mockHandleContinueConversation,
    isStravuConnected: false,
    setShowStravuSearch: mockSetShowStravuSearch,
    ultrathink: false,
    setUltrathink: mockSetUltrathink,
    handleToggleAutoCommit: mockHandleToggleAutoCommit,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API responses
    (window as any).electronAPI = {
      config: {
        update: vi.fn().mockResolvedValue({
          success: true,
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).electronAPI = undefined;
  });

  describe('Rendering', () => {
    it('renders textarea with current input', () => {
      render(<SessionInput {...defaultProps} />);
      
      const textarea = screen.getByDisplayValue('Test input');
      expect(textarea).toBeDefined();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('shows correct placeholder for waiting session', () => {
      render(<SessionInput {...defaultProps} />);
      
      const textarea = screen.getByPlaceholderText(/enter your response/i);
      expect(textarea).toBeDefined();
    });

    it('shows correct placeholder for terminal mode', () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      const textarea = screen.getByPlaceholderText(/enter terminal command/i);
      expect(textarea).toBeDefined();
    });

    it('shows correct placeholder for continue conversation', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const textarea = screen.getByPlaceholderText(/continue conversation/i);
      expect(textarea).toBeDefined();
    });

    it('shows correct placeholder for running script', () => {
      const session = createMockSession({ status: 'stopped', isRunning: true });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      const textarea = screen.getByPlaceholderText(/script is running/i);
      expect(textarea).toBeDefined();
    });
  });

  describe('Button Display', () => {
    it('shows Send button for waiting session', () => {
      render(<SessionInput {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /send/i });
      expect(button).toBeDefined();
    });

    it('shows Run button for terminal mode', () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      const button = screen.getByRole('button', { name: /run/i });
      expect(button).toBeDefined();
    });

    it('shows Continue button for stopped session', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).toBeDefined();
    });
  });

  describe('Input Handling', () => {
    it('calls setInput when textarea value changes', async () => {
      render(<SessionInput {...defaultProps} />);
      
      const textarea = screen.getByDisplayValue('Test input');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'New input');
      
      expect(mockSetInput).toHaveBeenCalledWith('New input');
    });

    it('handles keyboard shortcuts correctly', async () => {
      render(<SessionInput {...defaultProps} />);
      
      const textarea = screen.getByDisplayValue('Test input');
      await userEvent.click(textarea);
      await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
      
      expect(mockHandleSendInput).toHaveBeenCalled();
    });

    it('handles Ctrl+Enter shortcut', async () => {
      render(<SessionInput {...defaultProps} />);
      
      const textarea = screen.getByDisplayValue('Test input');
      await userEvent.click(textarea);
      await userEvent.keyboard('{Control>}{Enter}{/Control}');
      
      expect(mockHandleSendInput).toHaveBeenCalled();
    });

    it('handles terminal command shortcut', async () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      const textarea = screen.getByDisplayValue('Test input');
      await userEvent.click(textarea);
      await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
      
      expect(mockHandleTerminalCommand).toHaveBeenCalled();
    });

    it('handles continue conversation shortcut', async () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const textarea = screen.getByDisplayValue('Test input');
      await userEvent.click(textarea);
      await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
      
      expect(mockHandleContinueConversation).toHaveBeenCalledWith('claude-sonnet-4-20250514');
    });
  });

  describe('Button Clicks', () => {
    it('calls handleSendInput when Send button is clicked', async () => {
      render(<SessionInput {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /send/i });
      await userEvent.click(button);
      
      expect(mockHandleSendInput).toHaveBeenCalled();
    });

    it('calls handleTerminalCommand when Run button is clicked', async () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      const button = screen.getByRole('button', { name: /run/i });
      await userEvent.click(button);
      
      expect(mockHandleTerminalCommand).toHaveBeenCalled();
    });

    it('calls handleContinueConversation when Continue button is clicked', async () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const button = screen.getByRole('button', { name: /continue/i });
      await userEvent.click(button);
      
      expect(mockHandleContinueConversation).toHaveBeenCalledWith('claude-sonnet-4-20250514');
    });
  });

  describe('Checkboxes', () => {
    it('renders ultrathink checkbox', () => {
      render(<SessionInput {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/ultrathink/i);
      expect(checkbox).toBeDefined();
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    });

    it('renders auto-commit checkbox', () => {
      render(<SessionInput {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/auto-commit/i);
      expect(checkbox).toBeDefined();
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    });

    it('toggles ultrathink when checkbox is clicked', async () => {
      render(<SessionInput {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/ultrathink/i);
      await userEvent.click(checkbox);
      
      expect(mockSetUltrathink).toHaveBeenCalledWith(true);
    });

    it('toggles auto-commit when checkbox is clicked', async () => {
      render(<SessionInput {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/auto-commit/i);
      await userEvent.click(checkbox);
      
      expect(mockHandleToggleAutoCommit).toHaveBeenCalled();
    });

    it('shows correct ultrathink state when enabled', () => {
      render(<SessionInput {...defaultProps} ultrathink={true} />);
      
      const checkbox = screen.getByLabelText(/ultrathink/i);
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    });

    it('shows correct auto-commit state when disabled', () => {
      const session = createMockSession({ autoCommit: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const checkbox = screen.getByLabelText(/auto-commit/i);
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    });
  });

  describe('Model Selection', () => {
    it('shows model selector for continue conversation', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const modelSelect = screen.getByDisplayValue(/sonnet: best for most coding tasks/i);
      expect(modelSelect).toBeDefined();
    });

    it('does not show model selector for waiting session', () => {
      render(<SessionInput {...defaultProps} />);
      
      const modelSelect = screen.queryByDisplayValue(/sonnet: best for most coding tasks/i);
      expect(modelSelect).toBeNull();
    });

    it('does not show model selector for terminal mode', () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      const modelSelect = screen.queryByDisplayValue(/sonnet: best for most coding tasks/i);
      expect(modelSelect).toBeNull();
    });

    it('updates selected model when changed', async () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const modelSelect = screen.getByDisplayValue(/sonnet: best for most coding tasks/i);
      await userEvent.selectOptions(modelSelect, 'claude-opus-4-20250514');
      
      expect((window as any).electronAPI.config.update).toHaveBeenCalledWith({
        defaultModel: 'claude-opus-4-20250514',
      });
    });

    it('shows correct model options', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      expect(screen.getByText(/sonnet: best for most coding tasks/i)).toBeDefined();
      expect(screen.getByText(/opus: complex architecture/i)).toBeDefined();
      expect(screen.getByText(/haiku: fast & cost-effective/i)).toBeDefined();
    });

    it('calls continue conversation with selected model', async () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const modelSelect = screen.getByDisplayValue(/sonnet: best for most coding tasks/i);
      await userEvent.selectOptions(modelSelect, 'claude-opus-4-20250514');
      
      const button = screen.getByRole('button', { name: /continue/i });
      await userEvent.click(button);
      
      expect(mockHandleContinueConversation).toHaveBeenCalledWith('claude-opus-4-20250514');
    });
  });

  describe('Stravu Integration', () => {
    it('shows Stravu search button when connected', () => {
      render(<SessionInput {...defaultProps} isStravuConnected={true} />);
      
      const stravuButton = screen.getByTitle(/search stravu files/i);
      expect(stravuButton).toBeDefined();
    });

    it('does not show Stravu search button when not connected', () => {
      render(<SessionInput {...defaultProps} isStravuConnected={false} />);
      
      const stravuButton = screen.queryByTitle(/search stravu files/i);
      expect(stravuButton).toBeNull();
    });

    it('calls setShowStravuSearch when button is clicked', async () => {
      render(<SessionInput {...defaultProps} isStravuConnected={true} />);
      
      const stravuButton = screen.getByTitle(/search stravu files/i);
      await userEvent.click(stravuButton);
      
      expect(mockSetShowStravuSearch).toHaveBeenCalledWith(true);
    });
  });

  describe('Terminal Mode Specifics', () => {
    it('shows terminal mode indicator', () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      expect(screen.getByText(/terminal mode: commands will execute/i)).toBeDefined();
    });

    it('does not show terminal indicator for non-terminal modes', () => {
      render(<SessionInput {...defaultProps} viewMode="richOutput" />);
      
      expect(screen.queryByText(/terminal mode: commands will execute/i)).toBeNull();
    });

    it('does not show terminal indicator when script is running', () => {
      const session = createMockSession({ status: 'stopped', isRunning: true });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      expect(screen.queryByText(/terminal mode: commands will execute/i)).toBeNull();
    });

    it('does not show terminal indicator when session is waiting', () => {
      const session = createMockSession({ status: 'waiting', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      expect(screen.queryByText(/terminal mode: commands will execute/i)).toBeNull();
    });
  });

  describe('Session Model Updates', () => {
    it('updates selected model when session changes', () => {
      const session1 = createMockSession({ model: 'claude-sonnet-4-20250514' });
      const session2 = createMockSession({ model: 'claude-opus-4-20250514', status: 'stopped' });
      
      const { rerender } = render(<SessionInput {...defaultProps} activeSession={session1} />);
      
      rerender(<SessionInput {...defaultProps} activeSession={session2} />);
      
      // Model selector should show the new model
      expect(screen.getByDisplayValue(/opus: complex architecture/i)).toBeDefined();
    });

    it('falls back to default model when session model is not set', () => {
      const session = createMockSession({ model: undefined, status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      // Should default to Sonnet
      expect(screen.getByDisplayValue(/sonnet: best for most coding tasks/i)).toBeDefined();
    });
  });

  describe('Help Text', () => {
    it('shows help text for continue conversation', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      expect(screen.getByText(/this will interrupt the current session/i)).toBeDefined();
    });

    it('does not show help text for waiting session', () => {
      render(<SessionInput {...defaultProps} />);
      
      expect(screen.queryByText(/this will interrupt the current session/i)).toBeNull();
    });

    it('does not show help text for terminal mode', () => {
      const session = createMockSession({ status: 'stopped', isRunning: false });
      
      render(<SessionInput {...defaultProps} activeSession={session} viewMode="terminal" />);
      
      expect(screen.queryByText(/this will interrupt the current session/i)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<SessionInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDefined();
      
      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('has proper titles for tooltips', () => {
      render(<SessionInput {...defaultProps} />);
      
      const ultrathinkCheckbox = screen.getByTitle(/triggers claude code to use its maximum thinking/i);
      expect(ultrathinkCheckbox).toBeDefined();
      
      const autoCommitCheckbox = screen.getByTitle(/automatically commit changes after each prompt/i);
      expect(autoCommitCheckbox).toBeDefined();
    });

    it('shows model selection title', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const modelSelect = screen.getByTitle(/ai model to use for continuing/i);
      expect(modelSelect).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles model update errors gracefully', async () => {
      (window as any).electronAPI.config.update.mockRejectedValue(new Error('Update failed'));
      
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionInput {...defaultProps} activeSession={session} />);
      
      const modelSelect = screen.getByDisplayValue(/sonnet: best for most coding tasks/i);
      await userEvent.selectOptions(modelSelect, 'claude-opus-4-20250514');
      
      // Should not crash - error is logged but not displayed to user
      expect(screen.getByDisplayValue(/opus: complex architecture/i)).toBeDefined();
    });
  });
});