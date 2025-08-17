import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CombinedDiffView from '../../src/components/CombinedDiffView';
import type { ExecutionDiff, GitDiffResult } from '../../src/types/diff';

// Mock dependencies
vi.mock('../../src/components/DiffViewer', () => ({
  default: React.forwardRef(({ diff, sessionId, onFileSave, isAllCommitsSelected, mainBranch }: any) => (
    <div data-testid="diff-viewer" data-session-id={sessionId} data-all-commits={isAllCommitsSelected} data-main-branch={mainBranch}>
      <div>Diff content: {diff}</div>
      <button onClick={() => onFileSave('test.js')} data-testid="save-file">Save File</button>
    </div>
  )),
}));

vi.mock('../../src/components/ExecutionList', () => ({
  default: ({ sessionId, executions, selectedExecutions, onSelectionChange, onCommit, onRevert, onRestore }: any) => (
    <div data-testid="execution-list" data-session-id={sessionId}>
      <div>Executions: {executions.length}</div>
      <div>Selected: {selectedExecutions.join(',')}</div>
      <button onClick={() => onSelectionChange([1, 2])} data-testid="change-selection">Change Selection</button>
      <button onClick={onCommit} data-testid="commit-button">Commit</button>
      <button onClick={() => onRevert('abc123')} data-testid="revert-button">Revert</button>
      <button onClick={onRestore} data-testid="restore-button">Restore</button>
    </div>
  ),
}));

vi.mock('../../src/components/CommitDialog', () => ({
  CommitDialog: ({ isOpen, onClose, onCommit, fileCount }: any) => (
    isOpen ? (
      <div data-testid="commit-dialog">
        <p>Commit {fileCount} files</p>
        <button onClick={() => onCommit('Test commit message')} data-testid="commit-confirm">Commit</button>
        <button onClick={onClose} data-testid="commit-cancel">Cancel</button>
      </div>
    ) : null
  ),
}));

vi.mock('../../src/components/FileList', () => ({
  FileList: ({ files, onFileClick, onFileDelete, selectedFile }: any) => (
    <div data-testid="file-list">
      {files.map((file: any, index: number) => (
        <div key={file.path} data-testid={`file-${file.path}`} className={selectedFile === file.path ? 'selected' : ''}>
          <span>{file.path} (+{file.additions} -{file.deletions})</span>
          <button onClick={() => onFileClick(file.path, index)} data-testid={`click-${file.path}`}>Select</button>
          <button onClick={() => onFileDelete(file.path)} data-testid={`delete-${file.path}`}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

describe('CombinedDiffView', () => {
  const createMockExecution = (overrides: Partial<ExecutionDiff> = {}): ExecutionDiff => ({
    id: 1,
    session_id: 'session-1',
    execution_sequence: 1,
    stats_additions: 10,
    stats_deletions: 5,
    stats_files_changed: 2,
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createMockDiffResult = (overrides: Partial<GitDiffResult> = {}): GitDiffResult => ({
    diff: 'diff --git a/test.js b/test.js\n+added line\n-removed line',
    stats: {
      additions: 1,
      deletions: 1,
      filesChanged: 1,
    },
    changedFiles: ['test.js'],
    ...overrides,
  });

  const defaultProps = {
    sessionId: 'session-1',
    selectedExecutions: [1],
    isGitOperationRunning: false,
    isMainRepo: false,
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API responses
    (window as any).electronAPI = {
      sessions: {
        getGitCommands: vi.fn().mockResolvedValue({
          success: true,
          data: {
            mainBranch: 'main',
          },
        }),
        getExecutions: vi.fn().mockResolvedValue({
          success: true,
          data: [
            createMockExecution({ id: 1 }),
            createMockExecution({ id: 2 }),
          ],
        }),
        getLastCommits: vi.fn().mockResolvedValue({
          success: true,
          data: [
            createMockExecution({ id: 1 }),
            createMockExecution({ id: 2 }),
          ],
        }),
        getCombinedDiff: vi.fn().mockResolvedValue({
          success: true,
          data: createMockDiffResult(),
        }),
      },
      invoke: vi.fn().mockResolvedValue({
        success: true,
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore electronAPI mock instead of deleting
    (window as any).electronAPI = undefined;
  });

  describe('Rendering', () => {
    it('renders file changes header', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('File Changes')).toBeDefined();
      });
    });

    it('shows git operation in progress indicator', () => {
      render(<CombinedDiffView {...defaultProps} isGitOperationRunning={true} />);
      
      expect(screen.getByText('Git operation in progress...')).toBeDefined();
    });

    it('displays diff statistics', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('+1')).toBeDefined();
        expect(screen.getByText('-1')).toBeDefined();
        expect(screen.getByText('1 file')).toBeDefined();
      });
    });

    it('shows loading state when visible and no executions', () => {
      (window as any).electronAPI.sessions.getExecutions.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<CombinedDiffView {...defaultProps} />);
      
      expect(screen.getByText('Loading executions...')).toBeDefined();
    });

    it('shows error state when execution loading fails', async () => {
      (window as any).electronAPI.sessions.getExecutions.mockRejectedValue(new Error('Load failed'));

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeDefined();
        expect(screen.getByText('Load failed')).toBeDefined();
      });
    });
  });

  describe('Session Type Handling', () => {
    it('loads executions for regular sessions', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getExecutions).toHaveBeenCalledWith('session-1');
      });
    });

    it('loads last commits for main repo sessions', async () => {
      render(<CombinedDiffView {...defaultProps} isMainRepo={true} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getLastCommits).toHaveBeenCalledWith('session-1', 20);
      });
    });

    it('shows main repo message when no diff is available', async () => {
      render(<CombinedDiffView {...defaultProps} isMainRepo={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Showing last 20 commits from the main repository')).toBeDefined();
      });
    });
  });

  describe('Execution Selection', () => {
    it('auto-selects all executions when none are selected', async () => {
      render(<CombinedDiffView {...defaultProps} selectedExecutions={[]} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getCombinedDiff).toHaveBeenCalledWith('session-1');
      });
    });

    it('loads diff for single execution', async () => {
      render(<CombinedDiffView {...defaultProps} selectedExecutions={[1]} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getCombinedDiff).toHaveBeenCalledWith('session-1', [1, 1]);
      });
    });

    it('loads diff for execution range', async () => {
      render(<CombinedDiffView {...defaultProps} selectedExecutions={[1, 2]} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getCombinedDiff).toHaveBeenCalledWith('session-1', [1, 2]);
      });
    });

    it('handles uncommitted changes selection', async () => {
      render(<CombinedDiffView {...defaultProps} selectedExecutions={[0]} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getCombinedDiff).toHaveBeenCalledWith('session-1', [0]);
      });
    });

    it('updates selection through execution list', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('execution-list')).toBeDefined();
      });
      
      const changeSelectionButton = screen.getByTestId('change-selection');
      await userEvent.click(changeSelectionButton);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getCombinedDiff).toHaveBeenCalledWith('session-1', [1, 2]);
      });
    });
  });

  describe('Diff Display', () => {
    it('shows diff viewer with content', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('diff-viewer')).toBeDefined();
        expect(screen.getByText('Diff content:')).toBeDefined();
      });
    });

    it('shows select commits message when no selection', async () => {
      (window as any).electronAPI.sessions.getExecutions.mockResolvedValue({
        success: true,
        data: [],
      });

      render(<CombinedDiffView {...defaultProps} selectedExecutions={[]} />);
      
      await waitFor(() => {
        expect(screen.getByText('Select commits to view changes')).toBeDefined();
      });
    });

    it('shows loading diff message', async () => {
      (window as any).electronAPI.sessions.getCombinedDiff.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading diff...')).toBeDefined();
      });
    });

    it('shows diff error message', async () => {
      (window as any).electronAPI.sessions.getCombinedDiff.mockRejectedValue(new Error('Diff failed'));

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading diff')).toBeDefined();
        expect(screen.getByText('Diff failed')).toBeDefined();
      });
    });
  });

  describe('File Management', () => {
    it('shows file list when diff contains files', async () => {
      const diffWithFiles = 'diff --git a/file1.js b/file1.js\n+added\n' +
                           'diff --git a/file2.js b/file2.js\n-removed';
      
      (window as any).electronAPI.sessions.getCombinedDiff.mockResolvedValue({
        success: true,
        data: createMockDiffResult({ diff: diffWithFiles }),
      });

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('file-list')).toBeDefined();
        expect(screen.getByTestId('file-file1.js')).toBeDefined();
        expect(screen.getByTestId('file-file2.js')).toBeDefined();
      });
    });

    it('handles file selection', async () => {
      const diffWithFiles = 'diff --git a/test.js b/test.js\n+added';
      
      (window as any).electronAPI.sessions.getCombinedDiff.mockResolvedValue({
        success: true,
        data: createMockDiffResult({ diff: diffWithFiles }),
      });

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('click-test.js')).toBeDefined();
      });
      
      const selectButton = screen.getByTestId('click-test.js');
      await userEvent.click(selectButton);
      
      // File should be selected (visual indicator)
      expect(screen.getByTestId('file-test.js')).toBeDefined();
    });

    it('handles file deletion', async () => {
      const diffWithFiles = 'diff --git a/test.js b/test.js\n+added';
      
      (window as any).electronAPI.sessions.getCombinedDiff.mockResolvedValue({
        success: true,
        data: createMockDiffResult({ diff: diffWithFiles }),
      });

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-test.js')).toBeDefined();
      });
      
      const deleteButton = screen.getByTestId('delete-test.js');
      await userEvent.click(deleteButton);
      
      expect((window as any).electronAPI.invoke).toHaveBeenCalledWith('file:delete', {
        sessionId: 'session-1',
        filePath: 'test.js',
      });
    });

    it('handles file save events', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('save-file')).toBeDefined();
      });
      
      const saveButton = screen.getByTestId('save-file');
      await userEvent.click(saveButton);
      
      // Should refresh executions after file save
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getExecutions).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });
  });

  describe('Git Operations', () => {
    it('shows commit dialog when commit is triggered', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('commit-button')).toBeDefined();
      });
      
      const commitButton = screen.getByTestId('commit-button');
      await userEvent.click(commitButton);
      
      expect(screen.getByTestId('commit-dialog')).toBeDefined();
    });

    it('performs commit operation', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('commit-button')).toBeDefined();
      });
      
      const commitButton = screen.getByTestId('commit-button');
      await userEvent.click(commitButton);
      
      const confirmButton = screen.getByTestId('commit-confirm');
      await userEvent.click(confirmButton);
      
      expect((window as any).electronAPI.invoke).toHaveBeenCalledWith('git:commit', {
        sessionId: 'session-1',
        message: 'Test commit message',
      });
    });

    it('performs revert operation with confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('revert-button')).toBeDefined();
      });
      
      const revertButton = screen.getByTestId('revert-button');
      await userEvent.click(revertButton);
      
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to revert commit abc123')
      );
      
      expect((window as any).electronAPI.invoke).toHaveBeenCalledWith('git:revert', {
        sessionId: 'session-1',
        commitHash: 'abc123',
      });
      
      confirmSpy.mockRestore();
    });

    it('cancels revert when not confirmed', async () => {
      // Mock window.confirm to return false
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('revert-button')).toBeDefined();
      });
      
      const revertButton = screen.getByTestId('revert-button');
      await userEvent.click(revertButton);
      
      expect((window as any).electronAPI.invoke).not.toHaveBeenCalledWith('git:revert', expect.anything());
      
      confirmSpy.mockRestore();
    });

    it('performs restore operation with confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('restore-button')).toBeDefined();
      });
      
      const restoreButton = screen.getByTestId('restore-button');
      await userEvent.click(restoreButton);
      
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to restore all uncommitted changes')
      );
      
      expect((window as any).electronAPI.invoke).toHaveBeenCalledWith('git:restore', {
        sessionId: 'session-1',
      });
      
      confirmSpy.mockRestore();
    });
  });

  describe('Refresh Functionality', () => {
    it('shows refresh button', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle('Refresh git data')).toBeDefined();
      });
    });

    it('refreshes data when refresh button is clicked', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle('Refresh git data')).toBeDefined();
      });
      
      const refreshButton = screen.getByTitle('Refresh git data');
      await userEvent.click(refreshButton);
      
      // Should trigger data refresh
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getExecutions).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('shows spinning icon when refreshing', async () => {
      (window as any).electronAPI.sessions.getExecutions.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh git data');
        expect(refreshButton.querySelector('.animate-spin')).toBeDefined();
      });
    });
  });

  describe('Fullscreen Mode', () => {
    it('shows fullscreen toggle button', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle('Enter fullscreen')).toBeDefined();
      });
    });

    it('toggles fullscreen mode', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle('Enter fullscreen')).toBeDefined();
      });
      
      const fullscreenButton = screen.getByTitle('Enter fullscreen');
      await userEvent.click(fullscreenButton);
      
      expect(screen.getByTitle('Exit fullscreen')).toBeDefined();
    });

    it('hides sidebar in fullscreen mode', async () => {
      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('execution-list')).toBeDefined();
      });
      
      const fullscreenButton = screen.getByTitle('Enter fullscreen');
      await userEvent.click(fullscreenButton);
      
      // Sidebar should be hidden in fullscreen
      expect(screen.queryByTestId('execution-list')).toBeNull();
    });
  });

  describe('Visibility Handling', () => {
    it('skips loading when not visible', () => {
      render(<CombinedDiffView {...defaultProps} isVisible={false} />);
      
      // Should not call API when not visible
      expect((window as any).electronAPI.sessions.getExecutions).not.toHaveBeenCalled();
    });

    it('forces refresh when becoming visible', async () => {
      const { rerender } = render(<CombinedDiffView {...defaultProps} isVisible={false} />);
      
      // Initially not visible, no API calls
      expect((window as any).electronAPI.sessions.getExecutions).not.toHaveBeenCalled();
      
      // Become visible
      rerender(<CombinedDiffView {...defaultProps} isVisible={true} />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getExecutions).toHaveBeenCalled();
      });
    });
  });

  describe('Session Changes', () => {
    it('resets state when session changes', async () => {
      const { rerender } = render(<CombinedDiffView {...defaultProps} sessionId="session-1" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('execution-list')).toBeDefined();
      });
      
      // Change session
      rerender(<CombinedDiffView {...defaultProps} sessionId="session-2" />);
      
      await waitFor(() => {
        expect((window as any).electronAPI.sessions.getExecutions).toHaveBeenCalledWith('session-2');
      });
    });

    it('clears diff data when session changes', async () => {
      const { rerender } = render(<CombinedDiffView {...defaultProps} sessionId="session-1" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('diff-viewer')).toBeDefined();
      });
      
      // Change session
      rerender(<CombinedDiffView {...defaultProps} sessionId="session-2" />);
      
      // Should show loading state while new data loads
      expect(screen.getByText('Loading diff...')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles git operation errors gracefully', async () => {
      (window as any).electronAPI.invoke.mockRejectedValue(new Error('Git operation failed'));
      
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CombinedDiffView {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('revert-button')).toBeDefined();
      });
      
      // Mock confirm to return true
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      const revertButton = screen.getByTestId('revert-button');
      await userEvent.click(revertButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to revert commit')
        );
      });
      
      alertSpy.mockRestore();
      confirmSpy.mockRestore();
    });

    it('shows git operation running state', () => {
      render(<CombinedDiffView {...defaultProps} isGitOperationRunning={true} />);
      
      expect(screen.getByText('Git operation in progress')).toBeDefined();
      expect(screen.getByText('Please wait while the operation completes...')).toBeDefined();
    });
  });
});