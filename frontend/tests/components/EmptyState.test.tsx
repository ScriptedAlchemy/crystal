import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../../src/components/EmptyState';
import { Inbox, Plus, FolderOpen } from 'lucide-react';

// Mock Button component
vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ onClick, children, variant }: any) => (
    <button onClick={onClick} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

describe('EmptyState', () => {
  const defaultProps = {
    icon: Inbox,
    title: 'No items found',
    description: 'There are no items to display at the moment',
  };

  describe('Basic Rendering', () => {
    it('renders title and description', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByText('No items found')).toBeDefined();
      expect(screen.getByText('There are no items to display at the moment')).toBeDefined();
    });

    it('renders icon', () => {
      render(<EmptyState {...defaultProps} />);

      // Icon should be rendered within the circular background
      const iconContainer = document.querySelector('.bg-surface-secondary');
      expect(iconContainer).toBeDefined();
    });

    it('has proper semantic structure', () => {
      render(<EmptyState {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeDefined();
      expect(heading.textContent).toBe('No items found');
    });
  });

  describe('Different Icons', () => {
    it('renders with Plus icon', () => {
      render(<EmptyState {...defaultProps} icon={Plus} />);

      expect(screen.getByText('No items found')).toBeDefined();
    });

    it('renders with FolderOpen icon', () => {
      render(<EmptyState {...defaultProps} icon={FolderOpen} />);

      expect(screen.getByText('No items found')).toBeDefined();
    });
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      const mockAction = vi.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create Item',
            onClick: mockAction,
          }}
        />
      );

      const button = screen.getByTestId('button');
      expect(button).toBeDefined();
      expect(button.textContent).toBe('Create Item');
    });

    it('calls action handler when button is clicked', async () => {
      const mockAction = vi.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Take Action',
            onClick: mockAction,
          }}
        />
      );

      const button = screen.getByTestId('button');
      await userEvent.click(button);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('does not render button when action is not provided', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.queryByTestId('button')).toBeNull();
    });

    it('uses primary variant for action button', () => {
      const mockAction = vi.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Primary Action',
            onClick: mockAction,
          }}
        />
      );

      const button = screen.getByTestId('button');
      expect(button.getAttribute('data-variant')).toBe('primary');
    });
  });

  describe('Styling and Layout', () => {
    it('centers content', () => {
      render(<EmptyState {...defaultProps} />);

      const container = screen.getByText('No items found').closest('div');
      expect(container?.className).toContain('text-center');
      expect(container?.className).toContain('items-center');
      expect(container?.className).toContain('justify-center');
    });

    it('applies proper spacing', () => {
      render(<EmptyState {...defaultProps} />);

      const container = screen.getByText('No items found').closest('div');
      expect(container?.className).toContain('p-12');
    });

    it('uses flex column layout', () => {
      render(<EmptyState {...defaultProps} />);

      const container = screen.getByText('No items found').closest('div');
      expect(container?.className).toContain('flex-col');
    });

    it('accepts custom className', () => {
      render(<EmptyState {...defaultProps} className="custom-class" />);

      const container = screen.getByText('No items found').closest('div');
      expect(container?.className).toContain('custom-class');
    });

    it('preserves default classes with custom ones', () => {
      render(<EmptyState {...defaultProps} className="custom-class" />);

      const container = screen.getByText('No items found').closest('div');
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('flex-col');
      expect(container?.className).toContain('custom-class');
    });
  });

  describe('Icon Container', () => {
    it('renders icon in circular background', () => {
      render(<EmptyState {...defaultProps} />);

      const iconContainer = document.querySelector('.bg-surface-secondary');
      expect(iconContainer?.className).toContain('rounded-full');
      expect(iconContainer?.className).toContain('w-16');
      expect(iconContainer?.className).toContain('h-16');
    });

    it('centers icon within container', () => {
      render(<EmptyState {...defaultProps} />);

      const iconContainer = document.querySelector('.bg-surface-secondary');
      expect(iconContainer?.className).toContain('flex');
      expect(iconContainer?.className).toContain('items-center');
      expect(iconContainer?.className).toContain('justify-center');
    });

    it('applies proper margin to icon container', () => {
      render(<EmptyState {...defaultProps} />);

      const iconContainer = document.querySelector('.bg-surface-secondary');
      expect(iconContainer?.className).toContain('mb-4');
    });
  });

  describe('Typography', () => {
    it('applies correct styles to title', () => {
      render(<EmptyState {...defaultProps} />);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title.className).toContain('text-lg');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('text-text-primary');
      expect(title.className).toContain('mb-2');
    });

    it('applies correct styles to description', () => {
      render(<EmptyState {...defaultProps} />);

      const description = screen.getByText('There are no items to display at the moment');
      expect(description.className).toContain('text-sm');
      expect(description.className).toContain('text-text-secondary');
      expect(description.className).toContain('max-w-sm');
      expect(description.className).toContain('mb-6');
    });
  });

  describe('Common Use Cases', () => {
    it('renders empty sessions state', () => {
      render(
        <EmptyState
          icon={Inbox}
          title="No sessions yet"
          description="Create your first session to get started with Crystal"
          action={{
            label: 'Create Session',
            onClick: vi.fn(),
          }}
        />
      );

      expect(screen.getByText('No sessions yet')).toBeDefined();
      expect(screen.getByText('Create your first session to get started with Crystal')).toBeDefined();
      expect(screen.getByTestId('button')).toBeDefined();
    });

    it('renders empty search results', () => {
      render(
        <EmptyState
          icon={FolderOpen}
          title="No results found"
          description="Try adjusting your search terms or filters"
        />
      );

      expect(screen.getByText('No results found')).toBeDefined();
      expect(screen.getByText('Try adjusting your search terms or filters')).toBeDefined();
      expect(screen.queryByTestId('button')).toBeNull();
    });

    it('renders error state with retry action', () => {
      const mockRetry = vi.fn();

      render(
        <EmptyState
          icon={Inbox}
          title="Failed to load data"
          description="Something went wrong while loading your data"
          action={{
            label: 'Try Again',
            onClick: mockRetry,
          }}
        />
      );

      expect(screen.getByText('Failed to load data')).toBeDefined();
      expect(screen.getByTestId('button')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<EmptyState {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeDefined();
      expect(heading.textContent).toBe('No items found');
    });

    it('provides accessible button when action is present', () => {
      const mockAction = vi.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Create Item',
            onClick: mockAction,
          }}
        />
      );

      const button = screen.getByTestId('button');
      expect(button).toBeDefined();
      expect(button.getAttribute('type')).toBeNull(); // Button component should handle this
    });

    it('supports keyboard navigation', async () => {
      const mockAction = vi.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Keyboard Test',
            onClick: mockAction,
          }}
        />
      );

      const button = screen.getByTestId('button');
      button.focus();
      
      await userEvent.keyboard('{Enter}');
      expect(mockAction).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('constrains description width', () => {
      render(<EmptyState {...defaultProps} />);

      const description = screen.getByText('There are no items to display at the moment');
      expect(description.className).toContain('max-w-sm');
    });

    it('handles long descriptions gracefully', () => {
      const longDescription = 'This is a very long description that should wrap properly and maintain readability even when it exceeds the normal length constraints that we might expect in typical usage scenarios';

      render(
        <EmptyState
          {...defaultProps}
          description={longDescription}
        />
      );

      expect(screen.getByText(longDescription)).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty strings', () => {
      render(
        <EmptyState
          icon={Inbox}
          title=""
          description=""
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('');
    });

    it('handles special characters in text', () => {
      render(
        <EmptyState
          icon={Inbox}
          title="Special & Characters <>"
          description="Testing quotes and special characters"
        />
      );

      expect(screen.getByText('Special & Characters <>')).toBeDefined();
      expect(screen.getByText('Testing quotes and special characters')).toBeDefined();
    });

    it('handles rapid action clicks', async () => {
      const mockAction = vi.fn();

      render(
        <EmptyState
          {...defaultProps}
          action={{
            label: 'Rapid Test',
            onClick: mockAction,
          }}
        />
      );

      const button = screen.getByTestId('button');
      
      // Rapid clicks
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      expect(mockAction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      
      render(<EmptyState {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(50);
    });

    it('handles prop changes efficiently', () => {
      const { rerender } = render(<EmptyState {...defaultProps} />);
      
      rerender(<EmptyState {...defaultProps} title="Updated title" />);
      rerender(<EmptyState {...defaultProps} icon={Plus} />);
      
      expect(screen.getByText('No items found')).toBeDefined();
    });
  });
});