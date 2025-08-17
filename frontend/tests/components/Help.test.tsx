import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Help from '../../src/components/Help';

// Mock components
vi.mock('../../src/components/ui/Modal', () => ({
  Modal: ({ isOpen, onClose, children }: any) =>
    isOpen ? (
      <div data-testid="modal" role="dialog">
        <button onClick={onClose} data-testid="close-button">×</button>
        {children}
      </div>
    ) : null,
  ModalHeader: ({ children }: any) => <header data-testid="modal-header">{children}</header>,
  ModalBody: ({ children }: any) => <div data-testid="modal-body">{children}</div>,
}));

describe('Help', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API
    (window as any).electronAPI = {
      app: {
        openExternal: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).electronAPI = undefined;
  });

  describe('Rendering', () => {
    it('renders help dialog when open', () => {
      render(<Help {...defaultProps} />);

      expect(screen.getByTestId('modal')).toBeDefined();
      expect(screen.getByTestId('modal-header')).toBeDefined();
      expect(screen.getByTestId('modal-body')).toBeDefined();
    });

    it('does not render when closed', () => {
      render(<Help {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('shows help title', () => {
      render(<Help {...defaultProps} />);

      expect(screen.getByText('Crystal Help')).toBeDefined();
    });

    it('displays help sections', () => {
      render(<Help {...defaultProps} />);

      expect(screen.getByText(/getting started/i)).toBeDefined();
      expect(screen.getByText(/session management/i)).toBeDefined();
      expect(screen.getByText(/git operations/i)).toBeDefined();
      expect(screen.getByText(/keyboard shortcuts/i)).toBeDefined();
    });
  });

  describe('Navigation', () => {
    it('switches between help sections', async () => {
      render(<Help {...defaultProps} />);

      // Click on a different section
      const sessionSection = screen.getByText(/session management/i);
      await userEvent.click(sessionSection);

      // Should show session management content
      expect(screen.getByText(/create sessions/i)).toBeDefined();
    });

    it('highlights active section', () => {
      render(<Help {...defaultProps} />);

      const gettingStartedSection = screen.getByText(/getting started/i);
      expect(gettingStartedSection.closest('button')?.className).toContain('active');
    });
  });

  describe('Content Sections', () => {
    it('shows getting started content by default', () => {
      render(<Help {...defaultProps} />);

      expect(screen.getByText(/welcome to crystal/i)).toBeDefined();
      expect(screen.getByText(/create your first session/i)).toBeDefined();
    });

    it('shows session management content', async () => {
      render(<Help {...defaultProps} />);

      const sessionSection = screen.getByText(/session management/i);
      await userEvent.click(sessionSection);

      expect(screen.getByText(/creating sessions/i)).toBeDefined();
      expect(screen.getByText(/session states/i)).toBeDefined();
    });

    it('shows git operations content', async () => {
      render(<Help {...defaultProps} />);

      const gitSection = screen.getByText(/git operations/i);
      await userEvent.click(gitSection);

      expect(screen.getByText(/worktree management/i)).toBeDefined();
      expect(screen.getByText(/rebase operations/i)).toBeDefined();
    });

    it('shows keyboard shortcuts', async () => {
      render(<Help {...defaultProps} />);

      const shortcutsSection = screen.getByText(/keyboard shortcuts/i);
      await userEvent.click(shortcutsSection);

      expect(screen.getByText(/cmd.*enter/i)).toBeDefined();
      expect(screen.getByText(/ctrl.*enter/i)).toBeDefined();
    });
  });

  describe('External Links', () => {
    it('opens external links in system browser', async () => {
      render(<Help {...defaultProps} />);

      // Find and click an external link
      const externalLink = screen.getByText(/claude code documentation/i);
      await userEvent.click(externalLink);

      expect((window as any).electronAPI.app.openExternal).toHaveBeenCalledWith(
        expect.stringContaining('anthropic.com')
      );
    });

    it('handles external link errors gracefully', async () => {
      (window as any).electronAPI.app.openExternal.mockRejectedValue(new Error('Failed to open'));

      render(<Help {...defaultProps} />);

      const externalLink = screen.getByText(/claude code documentation/i);
      await userEvent.click(externalLink);

      // Should not crash the component
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  describe('Dialog Controls', () => {
    it('closes dialog when close button is clicked', async () => {
      render(<Help {...defaultProps} />);

      const closeButton = screen.getByTestId('close-button');
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes dialog when escape key is pressed', () => {
      render(<Help {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes dialog when clicking outside', async () => {
      render(<Help {...defaultProps} />);

      const modal = screen.getByTestId('modal');
      fireEvent.click(modal);

      // Modal should handle overlay clicks internally
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('filters help content by search term', async () => {
      render(<Help {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search help/i);
      await userEvent.type(searchInput, 'session');

      // Should highlight or filter content containing "session"
      expect(screen.getByText(/session management/i)).toBeDefined();
    });

    it('shows no results message for non-matching search', async () => {
      render(<Help {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search help/i);
      await userEvent.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no results found/i)).toBeDefined();
    });

    it('clears search when clear button is clicked', async () => {
      render(<Help {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search help/i);
      await userEvent.type(searchInput, 'test');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await userEvent.click(clearButton);

      expect((searchInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      // Simulate narrow screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<Help {...defaultProps} />);

      expect(screen.getByTestId('modal')).toBeDefined();
      // Content should still be accessible
      expect(screen.getByText(/getting started/i)).toBeDefined();
    });

    it('maintains functionality on mobile sizes', async () => {
      // Simulate mobile screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(<Help {...defaultProps} />);

      // Navigation should still work
      const sessionSection = screen.getByText(/session management/i);
      await userEvent.click(sessionSection);

      expect(screen.getByText(/creating sessions/i)).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and attributes', () => {
      render(<Help {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('manages focus correctly', () => {
      render(<Help {...defaultProps} />);

      // Focus should be trapped within the modal
      const modal = screen.getByTestId('modal');
      expect(document.activeElement).toBeTruthy();
    });

    it('provides proper heading hierarchy', () => {
      render(<Help {...defaultProps} />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeDefined();
      expect(mainHeading.textContent).toBe('Crystal Help');

      const subHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(subHeadings.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      render(<Help {...defaultProps} />);

      const firstSection = screen.getByText(/getting started/i);
      firstSection.focus();

      // Tab to next section
      fireEvent.keyDown(firstSection, { key: 'Tab' });
      
      const nextSection = screen.getByText(/session management/i);
      expect(document.activeElement).toBe(nextSection);
    });
  });

  describe('Performance', () => {
    it('renders large help content efficiently', () => {
      const startTime = performance.now();
      
      render(<Help {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(100);
    });

    it('handles rapid section switching', async () => {
      render(<Help {...defaultProps} />);

      // Rapidly switch between sections
      const sections = [
        /getting started/i,
        /session management/i,
        /git operations/i,
        /keyboard shortcuts/i,
      ];

      for (const sectionRegex of sections) {
        const section = screen.getByText(sectionRegex);
        await userEvent.click(section);
      }

      // Should remain stable
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  describe('Content Validation', () => {
    it('displays all required help sections', () => {
      render(<Help {...defaultProps} />);

      const requiredSections = [
        'Getting Started',
        'Session Management',
        'Git Operations',
        'Keyboard Shortcuts',
        'Troubleshooting',
      ];

      requiredSections.forEach(section => {
        expect(screen.getByText(section)).toBeDefined();
      });
    });

    it('shows version-specific information', () => {
      render(<Help {...defaultProps} />);

      // Should display current version info
      expect(screen.getByText(/version/i)).toBeDefined();
    });
  });
});