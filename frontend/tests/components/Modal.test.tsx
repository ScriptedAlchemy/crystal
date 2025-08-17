import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../src/components/ui/Modal';

describe('Modal', () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    children: <div data-testid="modal-content">Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.body.style for scroll lock
    Object.defineProperty(document.body, 'style', {
      value: {
        overflow: '',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  describe('Basic Rendering', () => {
    it('renders modal when open', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByTestId('modal-content')).toBeDefined();
    });

    it('does not render when closed', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByTestId('modal-content')).toBeNull();
    });

    it('renders children content', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByTestId('modal-content')).toBeDefined();
      expect(screen.getByText('Modal content')).toBeDefined();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<Modal {...defaultProps} size="sm" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('max-w-sm');
    });

    it('renders medium size (default)', () => {
      render(<Modal {...defaultProps} size="md" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('max-w-md');
    });

    it('renders large size', () => {
      render(<Modal {...defaultProps} size="lg" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('max-w-lg');
    });

    it('renders extra large size', () => {
      render(<Modal {...defaultProps} size="xl" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('max-w-xl');
    });

    it('renders full size', () => {
      render(<Modal {...defaultProps} size="full" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('max-w-full');
    });

    it('defaults to medium size when not specified', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('max-w-md');
    });
  });

  describe('Close Behavior', () => {
    it('shows close button by default', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeDefined();
    });

    it('hides close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);

      expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    });

    it('calls onClose when close button is clicked', async () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes on overlay click by default', async () => {
      render(<Modal {...defaultProps} />);

      const overlay = screen.getByTestId('modal-overlay');
      await userEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on overlay click when closeOnOverlayClick is false', async () => {
      render(<Modal {...defaultProps} closeOnOverlayClick={false} />);

      const overlay = screen.getByTestId('modal-overlay');
      await userEvent.click(overlay);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('does not close on content click', async () => {
      render(<Modal {...defaultProps} />);

      const content = screen.getByTestId('modal-content');
      await userEvent.click(content);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interactions', () => {
    it('closes on Escape key by default', () => {
      render(<Modal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on Escape when closeOnEscape is false', () => {
      render(<Modal {...defaultProps} closeOnEscape={false} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('ignores other key presses', () => {
      render(<Modal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      fireEvent.keyDown(document, { key: 'Tab' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Scroll Lock', () => {
    it('locks body scroll when modal opens', () => {
      render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(document.body.style.overflow).toBe('');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = render(<Modal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Backdrop and Overlay', () => {
    it('renders backdrop overlay', () => {
      render(<Modal {...defaultProps} />);

      const overlay = screen.getByTestId('modal-overlay');
      expect(overlay).toBeDefined();
      expect(overlay.className).toContain('fixed');
      expect(overlay.className).toContain('inset-0');
    });

    it('applies backdrop blur effect', () => {
      render(<Modal {...defaultProps} />);

      const overlay = screen.getByTestId('modal-overlay');
      expect(overlay.className).toContain('backdrop-blur');
    });

    it('applies semi-transparent background', () => {
      render(<Modal {...defaultProps} />);

      const overlay = screen.getByTestId('modal-overlay');
      expect(overlay.className).toContain('bg-black');
      expect(overlay.className).toContain('bg-opacity');
    });
  });

  describe('Focus Management', () => {
    it('focuses modal content when opened', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(document.activeElement).toBe(modal);
    });

    it('traps focus within modal', async () => {
      render(
        <Modal {...defaultProps}>
          <button data-testid="first-button">First</button>
          <button data-testid="second-button">Second</button>
        </Modal>
      );

      const firstButton = screen.getByTestId('first-button');
      const secondButton = screen.getByTestId('second-button');

      // Focus should be trapped within modal
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Tab to next element
      await userEvent.tab();
      expect(document.activeElement).toBe(secondButton);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and attributes', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeDefined();
      expect(modal.getAttribute('aria-modal')).toBe('true');
    });

    it('provides aria-labelledby when header is present', () => {
      render(
        <Modal {...defaultProps}>
          <ModalHeader>Test Header</ModalHeader>
          <ModalBody>Test Content</ModalBody>
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('provides aria-describedby when body is present', () => {
      render(
        <Modal {...defaultProps}>
          <ModalHeader>Test Header</ModalHeader>
          <ModalBody>Test Content</ModalBody>
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('has accessible close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton.getAttribute('aria-label')).toBe('Close modal');
    });
  });

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('custom-modal');
    });

    it('preserves default classes with custom ones', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);

      const modal = screen.getByRole('dialog');
      expect(modal.className).toContain('fixed');
      expect(modal.className).toContain('custom-modal');
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      
      render(<Modal {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(50);
    });

    it('handles rapid open/close efficiently', () => {
      const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);
      
      // Rapidly toggle open/close
      rerender(<Modal {...defaultProps} isOpen={true} />);
      rerender(<Modal {...defaultProps} isOpen={false} />);
      rerender(<Modal {...defaultProps} isOpen={true} />);
      
      expect(screen.getByRole('dialog')).toBeDefined();
    });
  });
});

describe('ModalHeader', () => {
  it('renders header content', () => {
    render(<ModalHeader>Test Header</ModalHeader>);

    expect(screen.getByText('Test Header')).toBeDefined();
  });

  it('applies proper styling', () => {
    render(<ModalHeader>Test Header</ModalHeader>);

    const header = screen.getByText('Test Header');
    expect(header.className).toContain('text-lg');
    expect(header.className).toContain('font-semibold');
  });

  it('has proper semantic markup', () => {
    render(<ModalHeader>Test Header</ModalHeader>);

    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toBeDefined();
    expect(header.textContent).toBe('Test Header');
  });
});

describe('ModalBody', () => {
  it('renders body content', () => {
    render(<ModalBody>Test body content</ModalBody>);

    expect(screen.getByText('Test body content')).toBeDefined();
  });

  it('applies proper styling', () => {
    render(<ModalBody>Test content</ModalBody>);

    const body = screen.getByText('Test content');
    expect(body.className).toContain('py-4');
  });

  it('handles complex content', () => {
    render(
      <ModalBody>
        <div>Complex content</div>
        <button>Action button</button>
        <p>Description text</p>
      </ModalBody>
    );

    expect(screen.getByText('Complex content')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Action button' })).toBeDefined();
    expect(screen.getByText('Description text')).toBeDefined();
  });
});

describe('ModalFooter', () => {
  it('renders footer content', () => {
    render(<ModalFooter>Footer content</ModalFooter>);

    expect(screen.getByText('Footer content')).toBeDefined();
  });

  it('applies proper styling', () => {
    render(<ModalFooter>Footer</ModalFooter>);

    const footer = screen.getByText('Footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('justify-end');
  });

  it('handles action buttons', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Confirm</button>
      </ModalFooter>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
  });
});

describe('Modal Composition', () => {
  it('renders complete modal with all parts', () => {
    const mockOnClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <ModalHeader>Complete Modal</ModalHeader>
        <ModalBody>
          This is a complete modal with header, body, and footer.
        </ModalBody>
        <ModalFooter>
          <button onClick={mockOnClose}>Close</button>
        </ModalFooter>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Complete Modal' })).toBeDefined();
    expect(screen.getByText('This is a complete modal with header, body, and footer.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });

  it('maintains proper structure and spacing', () => {
    const mockOnClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <ModalHeader>Structured Modal</ModalHeader>
        <ModalBody>Body content</ModalBody>
        <ModalFooter>Footer content</ModalFooter>
      </Modal>
    );

    const modal = screen.getByRole('dialog');
    expect(modal.children.length).toBeGreaterThan(0);
  });
});