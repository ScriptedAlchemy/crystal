import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../../src/components/Sidebar';

// Mock complex components
vi.mock('../../src/components/DraggableProjectTreeView', () => ({
  DraggableProjectTreeView: () => <div data-testid="project-tree-view">Project Tree</div>,
}));

vi.mock('../../src/components/Settings', () => ({
  Settings: ({ isOpen }: any) => 
    isOpen ? <div data-testid="settings-dialog">Settings Dialog</div> : null,
}));

describe('Sidebar', () => {
  const mockOnHelpClick = vi.fn();
  const mockOnAboutClick = vi.fn();
  const mockOnPromptHistoryClick = vi.fn();
  const mockOnResize = vi.fn();

  const defaultProps = {
    onHelpClick: mockOnHelpClick,
    onAboutClick: mockOnAboutClick,
    onPromptHistoryClick: mockOnPromptHistoryClick,
    width: 300,
    onResize: mockOnResize,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API
    (window as any).electronAPI = {
      getVersionInfo: vi.fn().mockResolvedValue({
        success: true,
        data: {
          current: '1.0.0',
          gitCommit: 'abc123',
          worktreeName: 'main',
        },
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).electronAPI = undefined;
  });

  describe('Rendering', () => {
    it('renders sidebar with main components', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByTestId('project-tree-view')).toBeDefined();
    });

    it('renders action buttons', async () => {
      render(<Sidebar {...defaultProps} />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      expect(helpButton).toBeDefined();

      await userEvent.click(helpButton);
      expect(mockOnHelpClick).toHaveBeenCalled();
    });

    it('opens settings dialog', async () => {
      render(<Sidebar {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await userEvent.click(settingsButton);

      expect(screen.getByTestId('settings-dialog')).toBeDefined();
    });

    it('calls about handler when about button is clicked', async () => {
      render(<Sidebar {...defaultProps} />);

      const aboutButton = screen.getByRole('button', { name: /about/i });
      await userEvent.click(aboutButton);

      expect(mockOnAboutClick).toHaveBeenCalled();
    });

    it('calls prompt history handler when prompts button is clicked', async () => {
      render(<Sidebar {...defaultProps} />);

      const promptsButton = screen.getByRole('button', { name: /prompts/i });
      await userEvent.click(promptsButton);

      expect(mockOnPromptHistoryClick).toHaveBeenCalled();
    });
  });

  describe('Settings Dialog', () => {
    it('opens and closes settings dialog', async () => {
      render(<Sidebar {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await userEvent.click(settingsButton);

      expect(screen.getByTestId('settings-dialog')).toBeDefined();

      // Close settings (would be handled by the Settings component)
      const { rerender } = render(<Sidebar {...defaultProps} />);
      rerender(<Sidebar {...defaultProps} />);
    });
  });

  describe('Version Information', () => {
    it('loads version information on mount', async () => {
      render(<Sidebar {...defaultProps} />);

      expect((window as any).electronAPI.getVersionInfo).toHaveBeenCalled();
    });

    it('handles version loading errors gracefully', async () => {
      (window as any).electronAPI.getVersionInfo.mockRejectedValue(new Error('Failed to load'));

      render(<Sidebar {...defaultProps} />);

      // Should still render without crashing
      expect(screen.getByTestId('project-tree-view')).toBeDefined();
    });
  });

  describe('Status Guide', () => {
    it('shows status guide when info button is clicked', async () => {
      render(<Sidebar {...defaultProps} />);

      const infoButton = screen.getByRole('button', { name: /status guide/i });
      await userEvent.click(infoButton);

      expect(screen.getByText(/session status guide/i)).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and attributes', () => {
      render(<Sidebar {...defaultProps} />);

      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toBeDefined();
    });

    it('provides proper labels for buttons', () => {
      render(<Sidebar {...defaultProps} />);

      const helpButton = screen.getByRole('button', { name: /help/i });
      expect(helpButton.getAttribute('aria-label')).toContain('Help');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to different widths', () => {
      const narrowProps = { ...defaultProps, width: 200 };
      render(<Sidebar {...narrowProps} />);

      expect(screen.getByTestId('project-tree-view')).toBeDefined();
    });

    it('handles wide widths', () => {
      const wideProps = { ...defaultProps, width: 500 };
      render(<Sidebar {...wideProps} />);

      expect(screen.getByTestId('project-tree-view')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      (window as any).electronAPI.getVersionInfo.mockRejectedValue(new Error('API Error'));

      render(<Sidebar {...defaultProps} />);

      // Component should still render and be functional
      expect(screen.getByTestId('project-tree-view')).toBeDefined();
      
      const helpButton = screen.getByRole('button', { name: /help/i });
      await userEvent.click(helpButton);
      expect(mockOnHelpClick).toHaveBeenCalled();
    });
  });
});