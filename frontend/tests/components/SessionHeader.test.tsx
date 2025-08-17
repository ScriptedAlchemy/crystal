import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionHeader } from '../../src/components/session/SessionHeader';
import type { Session, GitCommands } from '../../src/types/session';
import type { ViewMode } from '../../src/hooks/useSessionView';

// Mock dependencies
vi.mock('../../src/components/StatusIndicator', () => ({
  StatusIndicator: ({ session, size, showText, showProgress }: any) => (
    <div data-testid="status-indicator" data-status={session.status} data-size={size} data-show-text={showText} data-show-progress={showProgress}>
      Status: {session.status}
    </div>
  ),
}));

vi.mock('../../src/components/CommitModeIndicator', () => ({
  CommitModeIndicator: ({ mode }: any) => (
    <div data-testid="commit-mode-indicator" data-mode={mode}>
      Commit Mode: {mode}
    </div>
  ),
}));

vi.mock('../../src/components/session/ViewTabs', () => ({
  ViewTabs: ({ viewMode, setViewMode, unreadActivity, setUnreadActivity, isTerminalRunning, onSettingsClick, branchActions, isMerging }: any) => (
    <div data-testid="view-tabs" data-view-mode={viewMode} data-terminal-running={isTerminalRunning} data-merging={isMerging}>
      <div>Current view: {viewMode}</div>
      <div>Terminal running: {isTerminalRunning.toString()}</div>
      <div>Branch actions: {branchActions.length}</div>
      {unreadActivity.changes && <div data-testid="unread-changes">Changes unread</div>}
      {unreadActivity.terminal && <div data-testid="unread-terminal">Terminal unread</div>}
      <button onClick={() => setViewMode('terminal')} data-testid="switch-view">Switch View</button>
      <button onClick={() => setUnreadActivity({ ...unreadActivity, changes: false })} data-testid="clear-unread">Clear Unread</button>
      {onSettingsClick && <button onClick={onSettingsClick} data-testid="settings-click">Settings</button>}
      {branchActions.map((action: any) => (
        <button key={action.id} onClick={action.onClick} data-testid={`action-${action.id}`} disabled={action.disabled}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

describe('SessionHeader', () => {
  const mockSetEditName = vi.fn();
  const mockHandleNameKeyDown = vi.fn();
  const mockHandleSaveEditName = vi.fn();
  const mockHandleStartEditName = vi.fn();
  const mockHandleGitPull = vi.fn();
  const mockHandleGitPush = vi.fn();
  const mockHandleRebaseMainIntoWorktree = vi.fn();
  const mockHandleSquashAndRebaseToMain = vi.fn();
  const mockHandleOpenIDE = vi.fn();
  const mockSetViewMode = vi.fn();
  const mockSetUnreadActivity = vi.fn();
  const mockOnSettingsClick = vi.fn();

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session-1',
    name: 'Test Session',
    status: 'running',
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

  const createMockGitCommands = (overrides: Partial<GitCommands> = {}): GitCommands => ({
    rebaseCommands: ['git fetch origin', 'git rebase origin/main'],
    squashCommands: ['git reset --soft HEAD~3', 'git commit -m "Squashed commit"'],
    mainBranch: 'main',
    getPullCommand: () => 'pull origin main',
    getPushCommand: () => 'push origin feature-branch',
    getRebaseFromMainCommand: () => 'Pulls latest changes from main',
    getSquashAndRebaseToMainCommand: () => 'Squashes all commits and rebases onto main',
    ...overrides,
  });

  const defaultProps = {
    activeSession: createMockSession(),
    isEditingName: false,
    editName: 'Test Session',
    setEditName: mockSetEditName,
    handleNameKeyDown: mockHandleNameKeyDown,
    handleSaveEditName: mockHandleSaveEditName,
    handleStartEditName: mockHandleStartEditName,
    isMerging: false,
    handleGitPull: mockHandleGitPull,
    handleGitPush: mockHandleGitPush,
    handleRebaseMainIntoWorktree: mockHandleRebaseMainIntoWorktree,
    hasChangesToRebase: true,
    gitCommands: createMockGitCommands(),
    handleSquashAndRebaseToMain: mockHandleSquashAndRebaseToMain,
    handleOpenIDE: mockHandleOpenIDE,
    isOpeningIDE: false,
    hasIdeCommand: true,
    mergeError: null,
    viewMode: 'richOutput' as ViewMode,
    setViewMode: mockSetViewMode,
    unreadActivity: {
      changes: false,
      terminal: false,
      logs: false,
      editor: false,
      richOutput: false,
    },
    setUnreadActivity: mockSetUnreadActivity,
    onSettingsClick: mockOnSettingsClick,
    showSettings: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders session name', () => {
      render(<SessionHeader {...defaultProps} />);
      
      expect(screen.getByText('Test Session')).toBeDefined();
    });

    it('renders status indicator', () => {
      render(<SessionHeader {...defaultProps} />);
      
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toBeDefined();
      expect(statusIndicator.getAttribute('data-status')).toBe('running');
      expect(statusIndicator.getAttribute('data-show-text')).toBe('true');
      expect(statusIndicator.getAttribute('data-show-progress')).toBe('true');
    });

    it('renders commit mode indicator when commit mode is set', () => {
      const session = createMockSession({ commitMode: 'checkpoint' });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const commitModeIndicator = screen.getByTestId('commit-mode-indicator');
      expect(commitModeIndicator).toBeDefined();
      expect(commitModeIndicator.getAttribute('data-mode')).toBe('checkpoint');
    });

    it('does not render commit mode indicator when disabled', () => {
      const session = createMockSession({ commitMode: 'disabled' });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      expect(screen.queryByTestId('commit-mode-indicator')).toBeNull();
    });

    it('renders view tabs', () => {
      render(<SessionHeader {...defaultProps} />);
      
      const viewTabs = screen.getByTestId('view-tabs');
      expect(viewTabs).toBeDefined();
      expect(viewTabs.getAttribute('data-view-mode')).toBe('richOutput');
    });
  });

  describe('Session Name Editing', () => {
    it('shows editable input when editing name', () => {
      render(<SessionHeader {...defaultProps} isEditingName={true} editName="Edited Name" />);
      
      const input = screen.getByDisplayValue('Edited Name');
      expect(input).toBeDefined();
      expect(input.tagName).toBe('INPUT');
    });

    it('calls setEditName when input value changes', async () => {
      render(<SessionHeader {...defaultProps} isEditingName={true} editName="Test" />);
      
      const input = screen.getByDisplayValue('Test');
      await userEvent.clear(input);
      await userEvent.type(input, 'New Name');
      
      expect(mockSetEditName).toHaveBeenCalledWith('New Name');
    });

    it('calls handleNameKeyDown on key press', async () => {
      render(<SessionHeader {...defaultProps} isEditingName={true} editName="Test" />);
      
      const input = screen.getByDisplayValue('Test');
      await userEvent.type(input, '{Enter}');
      
      expect(mockHandleNameKeyDown).toHaveBeenCalled();
    });

    it('calls handleSaveEditName on blur', async () => {
      render(<SessionHeader {...defaultProps} isEditingName={true} editName="Test" />);
      
      const input = screen.getByDisplayValue('Test');
      await userEvent.click(input);
      await userEvent.tab(); // This triggers blur
      
      expect(mockHandleSaveEditName).toHaveBeenCalled();
    });

    it('calls handleStartEditName on double click', async () => {
      render(<SessionHeader {...defaultProps} />);
      
      const nameElement = screen.getByText('Test Session');
      await userEvent.dblClick(nameElement);
      
      expect(mockHandleStartEditName).toHaveBeenCalled();
    });

    it('shows hover text for name editing', () => {
      render(<SessionHeader {...defaultProps} />);
      
      const nameElement = screen.getByTitle(/double-click to rename/i);
      expect(nameElement).toBeDefined();
    });
  });

  describe('Main Repo Branch Actions', () => {
    it('shows pull and push actions for main repo', () => {
      const session = createMockSession({ isMainRepo: true });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      expect(screen.getByTestId('action-pull')).toBeDefined();
      expect(screen.getByTestId('action-push')).toBeDefined();
      expect(screen.getByText('Pull from Remote')).toBeDefined();
      expect(screen.getByText('Push to Remote')).toBeDefined();
    });

    it('calls handleGitPull when pull action is clicked', async () => {
      const session = createMockSession({ isMainRepo: true });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const pullButton = screen.getByTestId('action-pull');
      await userEvent.click(pullButton);
      
      expect(mockHandleGitPull).toHaveBeenCalled();
    });

    it('calls handleGitPush when push action is clicked', async () => {
      const session = createMockSession({ isMainRepo: true });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const pushButton = screen.getByTestId('action-push');
      await userEvent.click(pushButton);
      
      expect(mockHandleGitPush).toHaveBeenCalled();
    });

    it('disables actions when session is running', () => {
      const session = createMockSession({ isMainRepo: true, status: 'running' });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const pullButton = screen.getByTestId('action-pull');
      const pushButton = screen.getByTestId('action-push');
      
      expect(pullButton.hasAttribute('disabled')).toBe(true);
      expect(pushButton.hasAttribute('disabled')).toBe(true);
    });

    it('disables actions when merging', () => {
      const session = createMockSession({ isMainRepo: true });
      
      render(<SessionHeader {...defaultProps} activeSession={session} isMerging={true} />);
      
      const pullButton = screen.getByTestId('action-pull');
      const pushButton = screen.getByTestId('action-push');
      
      expect(pullButton.hasAttribute('disabled')).toBe(true);
      expect(pushButton.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Worktree Branch Actions', () => {
    it('shows rebase actions for worktree sessions', () => {
      render(<SessionHeader {...defaultProps} />);
      
      expect(screen.getByTestId('action-rebase-from-main')).toBeDefined();
      expect(screen.getByTestId('action-rebase-to-main')).toBeDefined();
      expect(screen.getByTestId('action-open-ide')).toBeDefined();
      expect(screen.getByText('Rebase from main')).toBeDefined();
      expect(screen.getByText('Rebase to main')).toBeDefined();
      expect(screen.getByText('Open in IDE')).toBeDefined();
    });

    it('calls handleRebaseMainIntoWorktree when rebase from main is clicked', async () => {
      render(<SessionHeader {...defaultProps} />);
      
      const rebaseButton = screen.getByTestId('action-rebase-from-main');
      await userEvent.click(rebaseButton);
      
      expect(mockHandleRebaseMainIntoWorktree).toHaveBeenCalled();
    });

    it('calls handleSquashAndRebaseToMain when rebase to main is clicked', async () => {
      render(<SessionHeader {...defaultProps} />);
      
      const rebaseButton = screen.getByTestId('action-rebase-to-main');
      await userEvent.click(rebaseButton);
      
      expect(mockHandleSquashAndRebaseToMain).toHaveBeenCalled();
    });

    it('calls handleOpenIDE when open IDE is clicked', async () => {
      render(<SessionHeader {...defaultProps} />);
      
      const ideButton = screen.getByTestId('action-open-ide');
      await userEvent.click(ideButton);
      
      expect(mockHandleOpenIDE).toHaveBeenCalled();
    });

    it('disables rebase from main when no changes to rebase', () => {
      render(<SessionHeader {...defaultProps} hasChangesToRebase={false} />);
      
      const rebaseButton = screen.getByTestId('action-rebase-from-main');
      expect(rebaseButton.hasAttribute('disabled')).toBe(true);
    });

    it('disables open IDE when no IDE command configured', () => {
      render(<SessionHeader {...defaultProps} hasIdeCommand={false} />);
      
      const ideButton = screen.getByTestId('action-open-ide');
      expect(ideButton.hasAttribute('disabled')).toBe(true);
    });

    it('shows opening state for IDE button', () => {
      render(<SessionHeader {...defaultProps} isOpeningIDE={true} />);
      
      expect(screen.getByText('Opening...')).toBeDefined();
    });

    it('disables IDE button when opening', () => {
      render(<SessionHeader {...defaultProps} isOpeningIDE={true} />);
      
      const ideButton = screen.getByTestId('action-open-ide');
      expect(ideButton.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Git Branch Names', () => {
    it('uses custom main branch name in actions', () => {
      const gitCommands = createMockGitCommands({ mainBranch: 'develop' });
      
      render(<SessionHeader {...defaultProps} gitCommands={gitCommands} />);
      
      expect(screen.getByText('Rebase from develop')).toBeDefined();
      expect(screen.getByText('Rebase to develop')).toBeDefined();
    });

    it('falls back to main when git commands not available', () => {
      render(<SessionHeader {...defaultProps} gitCommands={null} />);
      
      expect(screen.getByText('Rebase from main')).toBeDefined();
      expect(screen.getByText('Rebase to main')).toBeDefined();
    });
  });

  describe('Error Display', () => {
    it('shows merge error when present', () => {
      render(<SessionHeader {...defaultProps} mergeError="Git merge conflict occurred" />);
      
      expect(screen.getByText('Git merge conflict occurred')).toBeDefined();
    });

    it('does not show error container when no error', () => {
      render(<SessionHeader {...defaultProps} mergeError={null} />);
      
      expect(screen.queryByText(/error/i)).toBeNull();
    });

    it('styles error message appropriately', () => {
      render(<SessionHeader {...defaultProps} mergeError="Test error" />);
      
      const errorElement = screen.getByText('Test error');
      expect(errorElement.className).toContain('text-status-error');
    });
  });

  describe('View Tabs Integration', () => {
    it('passes correct props to ViewTabs', () => {
      const unreadActivity = {
        changes: true,
        terminal: false,
        logs: false,
        editor: false,
        richOutput: false,
      };
      
      render(<SessionHeader {...defaultProps} unreadActivity={unreadActivity} />);
      
      const viewTabs = screen.getByTestId('view-tabs');
      expect(viewTabs.getAttribute('data-view-mode')).toBe('richOutput');
      expect(viewTabs.getAttribute('data-terminal-running')).toBe('false');
      expect(viewTabs.getAttribute('data-merging')).toBe('false');
      expect(screen.getByTestId('unread-changes')).toBeDefined();
    });

    it('handles view mode changes', async () => {
      render(<SessionHeader {...defaultProps} />);
      
      const switchButton = screen.getByTestId('switch-view');
      await userEvent.click(switchButton);
      
      expect(mockSetViewMode).toHaveBeenCalledWith('terminal');
    });

    it('handles unread activity changes', async () => {
      const unreadActivity = {
        changes: true,
        terminal: false,
        logs: false,
        editor: false,
        richOutput: false,
      };
      
      render(<SessionHeader {...defaultProps} unreadActivity={unreadActivity} />);
      
      const clearButton = screen.getByTestId('clear-unread');
      await userEvent.click(clearButton);
      
      expect(mockSetUnreadActivity).toHaveBeenCalledWith(
        expect.objectContaining({ changes: false })
      );
    });

    it('calls onSettingsClick when settings is clicked', async () => {
      render(<SessionHeader {...defaultProps} />);
      
      const settingsButton = screen.getByTestId('settings-click');
      await userEvent.click(settingsButton);
      
      expect(mockOnSettingsClick).toHaveBeenCalled();
    });

    it('passes terminal running state', () => {
      const session = createMockSession({ isRunning: true });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const viewTabs = screen.getByTestId('view-tabs');
      expect(viewTabs.getAttribute('data-terminal-running')).toBe('true');
    });

    it('passes merging state to view tabs', () => {
      render(<SessionHeader {...defaultProps} isMerging={true} />);
      
      const viewTabs = screen.getByTestId('view-tabs');
      expect(viewTabs.getAttribute('data-merging')).toBe('true');
    });
  });

  describe('Action State Management', () => {
    it('disables actions when session is initializing', () => {
      const session = createMockSession({ status: 'initializing' });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const rebaseButton = screen.getByTestId('action-rebase-from-main');
      const ideButton = screen.getByTestId('action-open-ide');
      
      expect(rebaseButton.hasAttribute('disabled')).toBe(true);
      expect(ideButton.hasAttribute('disabled')).toBe(true);
    });

    it('enables actions when session is ready', () => {
      const session = createMockSession({ status: 'stopped' });
      
      render(<SessionHeader {...defaultProps} activeSession={session} />);
      
      const rebaseToMainButton = screen.getByTestId('action-rebase-to-main');
      const ideButton = screen.getByTestId('action-open-ide');
      
      expect(rebaseToMainButton.hasAttribute('disabled')).toBe(false);
      expect(ideButton.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<SessionHeader {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeDefined();
      expect(heading.textContent).toBe('Test Session');
    });

    it('has accessible input when editing name', () => {
      render(<SessionHeader {...defaultProps} isEditingName={true} editName="Test" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDefined();
      expect(input.hasAttribute('autoFocus')).toBe(true);
    });

    it('has accessible buttons for actions', () => {
      render(<SessionHeader {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button.textContent).toBeTruthy();
      });
    });
  });

  describe('Dynamic Content', () => {
    it('shows different content based on session type', () => {
      const mainRepoSession = createMockSession({ isMainRepo: true });
      const { rerender } = render(<SessionHeader {...defaultProps} activeSession={mainRepoSession} />);
      
      expect(screen.getByText('Pull from Remote')).toBeDefined();
      expect(screen.queryByText('Rebase from main')).toBeNull();
      
      const worktreeSession = createMockSession({ isMainRepo: false });
      rerender(<SessionHeader {...defaultProps} activeSession={worktreeSession} />);
      
      expect(screen.queryByText('Pull from Remote')).toBeNull();
      expect(screen.getByText('Rebase from main')).toBeDefined();
    });

    it('updates when session status changes', () => {
      const runningSession = createMockSession({ status: 'running' });
      const { rerender } = render(<SessionHeader {...defaultProps} activeSession={runningSession} />);
      
      let statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator.getAttribute('data-status')).toBe('running');
      
      const stoppedSession = createMockSession({ status: 'stopped' });
      rerender(<SessionHeader {...defaultProps} activeSession={stoppedSession} />);
      
      statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator.getAttribute('data-status')).toBe('stopped');
    });
  });
});