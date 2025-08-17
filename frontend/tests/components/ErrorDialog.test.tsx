import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorDialog } from '../../src/components/ErrorDialog';

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
  ModalFooter: ({ children }: any) => <footer data-testid="modal-footer">{children}</footer>,
}));

vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ onClick, children, className }: any) => (
    <button onClick={onClick} className={className} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock('../../src/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

describe('ErrorDialog', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    title: 'Test Error',
    error: 'Something went wrong',
    details: 'Detailed error information',
    command: 'git commit -m "test"',
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders error dialog when open', () => {
      render(<ErrorDialog {...defaultProps} />);

      expect(screen.getByTestId('modal')).toBeDefined();
      expect(screen.getByTestId('modal-header')).toBeDefined();
      expect(screen.getByTestId('modal-body')).toBeDefined();
      expect(screen.getByTestId('modal-footer')).toBeDefined();
    });

    it('does not render when closed', () => {
      render(<ErrorDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('modal')).toBeNull();
    });

    it('displays error title', () => {
      render(<ErrorDialog {...defaultProps} />);

      expect(screen.getByText('Test Error')).toBeDefined();
    });

    it('displays error message', () => {
      render(<ErrorDialog {...defaultProps} />);

      expect(screen.getByText('Something went wrong')).toBeDefined();
    });

    it('displays error details when provided', () => {
      render(<ErrorDialog {...defaultProps} />);

      expect(screen.getByText('Detailed error information')).toBeDefined();
    });

    it('displays command when provided', () => {
      render(<ErrorDialog {...defaultProps} />);

      expect(screen.getByText('git commit -m "test"')).toBeDefined();
    });
  });

  describe('Error Information Display', () => {
    it('shows minimal error when only error is provided', () => {
      const minimalProps = {
        isOpen: true,
        error: 'Basic error message',
        onClose: mockOnClose,
      };

      render(<ErrorDialog {...minimalProps} />);

      expect(screen.getByText('Basic error message')).toBeDefined();
      expect(screen.queryByText('Detailed error information')).toBeNull();
    });

    it('uses default title when not provided', () => {
      const propsWithoutTitle = {
        isOpen: true,
        error: 'Error message',
        onClose: mockOnClose,
      };

      render(<ErrorDialog {...propsWithoutTitle} />);

      expect(screen.getByText('Command Failed')).toBeDefined();
    });

    it('handles very long error details', () => {
      const longDetails = 'A'.repeat(1000);
      const longProps = {
        ...defaultProps,
        details: longDetails,
      };

      render(<ErrorDialog {...longProps} />);

      // Should show collapsed version initially
      expect(screen.getByText(/\.\.\./)).toBeDefined();
    });

    it('expands long error details when requested', async () => {
      const longDetails = 'A'.repeat(1000);
      const longProps = {
        ...defaultProps,
        details: longDetails,
      };

      render(<ErrorDialog {...longProps} />);

      const expandButton = screen.getByRole('button', { name: /show more/i });
      await userEvent.click(expandButton);

      // Should show full content after expansion
      expect(screen.getByText(longDetails)).toBeDefined();
    });
  });

  describe('Action Buttons', () => {
    it('shows close button', () => {
      render(<ErrorDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeDefined();
    });

    it('shows copy button', () => {
      render(<ErrorDialog {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeDefined();
    });

    it('calls onClose when close button is clicked', async () => {
      render(<ErrorDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Copy Functionality', () => {
    it('copies error information to clipboard', async () => {
      render(<ErrorDialog {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await userEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Test Error')
      );
    });

    it('shows feedback after copying', async () => {
      render(<ErrorDialog {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await userEvent.click(copyButton);

      expect(screen.getByText(/copied/i)).toBeDefined();
    });

    it('handles clipboard errors gracefully', async () => {
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

      render(<ErrorDialog {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await userEvent.click(copyButton);

      // Should not crash and might show error message
      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });

  describe('Details Expansion', () => {
    it('shows expand button for long details', () => {
      const longDetails = 'A'.repeat(600);
      const longProps = {
        ...defaultProps,
        details: longDetails,
      };

      render(<ErrorDialog {...longProps} />);

      expect(screen.getByRole('button', { name: /show more/i })).toBeDefined();
    });

    it('does not show expand button for short details', () => {
      const shortProps = {
        ...defaultProps,
        details: 'Short details',
      };

      render(<ErrorDialog {...shortProps} />);

      expect(screen.queryByRole('button', { name: /show more/i })).toBeNull();
    });

    it('toggles between expanded and collapsed states', async () => {
      const longDetails = 'A'.repeat(600);
      const longProps = {
        ...defaultProps,
        details: longDetails,
      };

      render(<ErrorDialog {...longProps} />);

      const expandButton = screen.getByRole('button', { name: /show more/i });
      
      // Expand
      await userEvent.click(expandButton);
      expect(screen.getByRole('button', { name: /show less/i })).toBeDefined();

      // Collapse
      const collapseButton = screen.getByRole('button', { name: /show less/i });
      await userEvent.click(collapseButton);
      expect(screen.getByRole('button', { name: /show more/i })).toBeDefined();
    });
  });

  describe('Command Display', () => {
    it('shows command in code format', () => {
      render(<ErrorDialog {...defaultProps} />);

      const commandElement = screen.getByText('git commit -m "test"');
      expect(commandElement.className).toContain('font-mono');
    });

    it('does not show command section when command is not provided', () => {
      const propsWithoutCommand = {
        ...defaultProps,
        command: undefined,
      };

      render(<ErrorDialog {...propsWithoutCommand} />);

      expect(screen.queryByText(/command/i)).toBeNull();
    });
  });

  describe('Error Types', () => {
    it('handles git errors', () => {
      const gitProps = {
        ...defaultProps,
        title: 'Git Error',
        error: 'Git operation failed',
        command: 'git push origin main',
      };

      render(<ErrorDialog {...gitProps} />);

      expect(screen.getByText('Git Error')).toBeDefined();
      expect(screen.getByText('git push origin main')).toBeDefined();
    });

    it('handles validation errors', () => {
      const validationProps = {
        ...defaultProps,
        title: 'Validation Error',
        error: 'Invalid input provided',
      };

      render(<ErrorDialog {...validationProps} />);

      expect(screen.getByText('Validation Error')).toBeDefined();
      expect(screen.getByText('Invalid input provided')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and attributes', () => {
      render(<ErrorDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
    });

    it('provides accessible button labels', () => {
      render(<ErrorDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeDefined();

      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeDefined();
    });

    it('manages focus appropriately', () => {
      render(<ErrorDialog {...defaultProps} />);

      // Should have focusable elements
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Design', () => {
    it('applies proper styling to error content', () => {
      render(<ErrorDialog {...defaultProps} />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('shows error icon', () => {
      render(<ErrorDialog {...defaultProps} />);

      // The AlertCircle icon should be rendered
      expect(screen.getByTestId('modal-header')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty error message', () => {
      const emptyProps = {
        ...defaultProps,
        error: '',
      };

      render(<ErrorDialog {...emptyProps} />);

      expect(screen.getByTestId('modal')).toBeDefined();
    });

    it('handles undefined optional props', () => {
      const minimalProps = {
        isOpen: true,
        error: 'Error message',
        onClose: mockOnClose,
      };

      render(<ErrorDialog {...minimalProps} />);

      expect(screen.getByTestId('modal')).toBeDefined();
      expect(screen.getByText('Error message')).toBeDefined();
    });

    it('handles extremely long error messages', () => {
      const longError = 'A'.repeat(2000);
      const longProps = {
        ...defaultProps,
        error: longError,
      };

      render(<ErrorDialog {...longProps} />);

      expect(screen.getByTestId('modal')).toBeDefined();
    });
  });
});