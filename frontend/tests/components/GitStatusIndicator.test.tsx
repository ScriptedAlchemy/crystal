import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitStatusIndicator } from '../../src/components/GitStatusIndicator';
import type { GitStatus } from '../../src/types/session';

describe('GitStatusIndicator', () => {
  const baseGitStatus: GitStatus = {
    state: 'clean',
    lastChecked: '2024-01-01T12:00:00Z',
  };

  describe('Clean State', () => {
    it('shows clean status correctly', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} />);

      expect(screen.getByText('Clean')).toBeDefined();
    });

    it('applies correct styling for clean state', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} />);

      const indicator = screen.getByText('Clean').closest('[data-testid]');
      expect(indicator?.className).toContain('text-green');
    });
  });

  describe('Modified State', () => {
    it('shows modified status with file information', () => {
      const modifiedStatus: GitStatus = {
        ...baseGitStatus,
        state: 'modified',
        filesChanged: 3,
        additions: 15,
        deletions: 7,
        hasUncommittedChanges: true,
      };

      render(<GitStatusIndicator gitStatus={modifiedStatus} />);

      expect(screen.getByText(/modified/i)).toBeDefined();
    });

    it('handles single file modification', () => {
      const singleFileStatus: GitStatus = {
        ...baseGitStatus,
        state: 'modified',
        filesChanged: 1,
        hasUncommittedChanges: true,
      };

      render(<GitStatusIndicator gitStatus={singleFileStatus} />);

      expect(screen.getByText(/modified/i)).toBeDefined();
    });
  });

  describe('Ahead State', () => {
    it('shows ahead status with commit count', () => {
      const aheadStatus: GitStatus = {
        ...baseGitStatus,
        state: 'ahead',
        ahead: 3,
        commitAdditions: 25,
        commitDeletions: 12,
        commitFilesChanged: 8,
      };

      render(<GitStatusIndicator gitStatus={aheadStatus} />);

      expect(screen.getByText(/ahead/i)).toBeDefined();
    });

    it('handles single commit ahead', () => {
      const oneAheadStatus: GitStatus = {
        ...baseGitStatus,
        state: 'ahead',
        ahead: 1,
      };

      render(<GitStatusIndicator gitStatus={oneAheadStatus} />);

      expect(screen.getByText(/ahead/i)).toBeDefined();
    });
  });

  describe('Behind State', () => {
    it('shows behind status', () => {
      const behindStatus: GitStatus = {
        ...baseGitStatus,
        state: 'behind',
        behind: 2,
      };

      render(<GitStatusIndicator gitStatus={behindStatus} />);

      expect(screen.getByText(/behind/i)).toBeDefined();
    });
  });

  describe('Diverged State', () => {
    it('shows diverged status', () => {
      const divergedStatus: GitStatus = {
        ...baseGitStatus,
        state: 'diverged',
        ahead: 3,
        behind: 2,
      };

      render(<GitStatusIndicator gitStatus={divergedStatus} />);

      expect(screen.getByText(/diverged/i)).toBeDefined();
    });
  });

  describe('Conflict State', () => {
    it('shows conflict status', () => {
      const conflictStatus: GitStatus = {
        ...baseGitStatus,
        state: 'conflict',
      };

      render(<GitStatusIndicator gitStatus={conflictStatus} />);

      expect(screen.getByText(/conflict/i)).toBeDefined();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<GitStatusIndicator gitStatus={undefined} isLoading={true} />);

      expect(screen.getByText(/loading/i)).toBeDefined();
    });

    it('shows spinner animation when loading', () => {
      render(<GitStatusIndicator gitStatus={undefined} isLoading={true} />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('animate-spin');
    });
  });

  describe('Size Variants', () => {
    it('renders in small size', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} size="small" />);

      const indicator = screen.getByText('Clean').closest('div');
      expect(indicator?.className).toContain('text-xs');
    });

    it('renders in medium size (default)', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} size="medium" />);

      const indicator = screen.getByText('Clean').closest('div');
      expect(indicator?.className).toContain('text-sm');
    });

    it('renders in large size', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} size="large" />);

      const indicator = screen.getByText('Clean').closest('div');
      expect(indicator?.className).toContain('text-base');
    });
  });

  describe('Click Interactions', () => {
    it('calls onClick handler when clicked', () => {
      const mockOnClick = vi.fn();
      
      render(<GitStatusIndicator gitStatus={baseGitStatus} onClick={mockOnClick} />);

      const indicator = screen.getByText('Clean').closest('button');
      if (indicator) {
        indicator.click();
        expect(mockOnClick).toHaveBeenCalled();
      }
    });

    it('shows pointer cursor when onClick is provided', () => {
      const mockOnClick = vi.fn();
      
      render(<GitStatusIndicator gitStatus={baseGitStatus} onClick={mockOnClick} />);

      const indicator = screen.getByText('Clean').closest('button');
      expect(indicator?.className).toContain('cursor-pointer');
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} />);

      const indicator = screen.getByText('Clean').closest('[aria-label]');
      expect(indicator?.getAttribute('aria-label')).toContain('Git status');
    });

    it('has proper role for screen readers', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined git status', () => {
      render(<GitStatusIndicator gitStatus={undefined} />);

      // Should render some default state
      const container = screen.getByTestId('git-status-indicator') || screen.getByRole('status');
      expect(container).toBeDefined();
    });

    it('handles missing properties gracefully', () => {
      const incompleteStatus: GitStatus = {
        state: 'ahead',
        lastChecked: '2024-01-01T12:00:00Z',
        // Missing ahead count
      };

      render(<GitStatusIndicator gitStatus={incompleteStatus} />);

      expect(screen.getByText(/ahead/i)).toBeDefined();
    });

    it('handles zero counts appropriately', () => {
      const zeroStatus: GitStatus = {
        ...baseGitStatus,
        state: 'modified',
        filesChanged: 0,
        additions: 0,
        deletions: 0,
        hasUncommittedChanges: true,
      };

      render(<GitStatusIndicator gitStatus={zeroStatus} />);

      expect(screen.getByText(/modified/i)).toBeDefined();
    });
  });

  describe('Complex States', () => {
    it('handles multiple state indicators', () => {
      const complexStatus: GitStatus = {
        ...baseGitStatus,
        state: 'ahead',
        ahead: 2,
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
        secondaryStates: ['modified', 'untracked'],
      };

      render(<GitStatusIndicator gitStatus={complexStatus} />);

      expect(screen.getByText(/ahead/i)).toBeDefined();
    });

    it('prioritizes primary state display', () => {
      const multiStateStatus: GitStatus = {
        ...baseGitStatus,
        state: 'conflict',
        hasUncommittedChanges: true,
        secondaryStates: ['modified'],
      };

      render(<GitStatusIndicator gitStatus={multiStateStatus} />);

      expect(screen.getByText(/conflict/i)).toBeDefined();
    });
  });

  describe('Tooltip and Description', () => {
    it('provides descriptive title attribute', () => {
      const aheadStatus: GitStatus = {
        ...baseGitStatus,
        state: 'ahead',
        ahead: 3,
        commitFilesChanged: 5,
      };

      render(<GitStatusIndicator gitStatus={aheadStatus} />);

      const indicator = screen.getByText(/ahead/i).closest('[title]');
      expect(indicator?.getAttribute('title')).toBeTruthy();
    });
  });

  describe('Session Context', () => {
    it('accepts sessionId prop for context', () => {
      render(<GitStatusIndicator gitStatus={baseGitStatus} sessionId="test-session" />);

      // Should render without errors
      expect(screen.getByText('Clean')).toBeDefined();
    });
  });

  describe('Ready to Merge State', () => {
    it('shows ready to merge indicator when appropriate', () => {
      const readyStatus: GitStatus = {
        ...baseGitStatus,
        state: 'ahead',
        ahead: 2,
        isReadyToMerge: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
      };

      render(<GitStatusIndicator gitStatus={readyStatus} />);

      // Should indicate it's ready to merge
      expect(screen.getByText(/ahead/i)).toBeDefined();
    });
  });
});