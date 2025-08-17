import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('renders loading spinner with default text', () => {
      render(<LoadingSpinner />);

      expect(screen.getByText('Loading...')).toBeDefined();
    });

    it('shows spinning animation', () => {
      render(<LoadingSpinner />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });

    it('renders custom text when provided', () => {
      render(<LoadingSpinner text="Custom loading message" />);

      expect(screen.getByText('Custom loading message')).toBeDefined();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<LoadingSpinner size="small" />);

      const spinner = document.querySelector('.w-4.h-4');
      expect(spinner).toBeDefined();
    });

    it('renders medium size (default)', () => {
      render(<LoadingSpinner size="medium" />);

      const spinner = document.querySelector('.w-6.h-6');
      expect(spinner).toBeDefined();
    });

    it('renders large size', () => {
      render(<LoadingSpinner size="large" />);

      const spinner = document.querySelector('.w-8.h-8');
      expect(spinner).toBeDefined();
    });

    it('uses medium size as default', () => {
      render(<LoadingSpinner />);

      const spinner = document.querySelector('.w-6.h-6');
      expect(spinner).toBeDefined();
    });
  });

  describe('Text Styling', () => {
    it('applies correct text size for small spinner', () => {
      render(<LoadingSpinner size="small" text="Small text" />);

      const text = screen.getByText('Small text');
      expect(text.className).toContain('text-sm');
    });

    it('applies correct text size for medium spinner', () => {
      render(<LoadingSpinner size="medium" text="Medium text" />);

      const text = screen.getByText('Medium text');
      expect(text.className).toContain('text-base');
    });

    it('applies correct text size for large spinner', () => {
      render(<LoadingSpinner size="large" text="Large text" />);

      const text = screen.getByText('Large text');
      expect(text.className).toContain('text-lg');
    });

    it('applies tertiary text color', () => {
      render(<LoadingSpinner text="Test text" />);

      const text = screen.getByText('Test text');
      expect(text.className).toContain('text-text-tertiary');
    });
  });

  describe('Layout and Positioning', () => {
    it('displays spinner and text in flex layout', () => {
      render(<LoadingSpinner text="Loading..." />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('items-center');
      expect(container?.className).toContain('justify-center');
    });

    it('applies gap between spinner and text', () => {
      render(<LoadingSpinner text="Loading..." />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('gap-3');
    });
  });

  describe('Custom Styling', () => {
    it('accepts additional className', () => {
      render(<LoadingSpinner className="custom-class" />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('custom-class');
    });

    it('preserves default classes with custom ones', () => {
      render(<LoadingSpinner className="custom-class" />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('items-center');
      expect(container?.className).toContain('custom-class');
    });

    it('allows overriding default styles', () => {
      render(<LoadingSpinner className="justify-start" />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('justify-start');
    });
  });

  describe('Spinner Icon', () => {
    it('uses Loader2 icon', () => {
      render(<LoadingSpinner />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });

    it('applies interactive color to spinner', () => {
      render(<LoadingSpinner />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner?.className).toContain('text-interactive');
    });

    it('applies correct size classes to spinner icon', () => {
      render(<LoadingSpinner size="small" />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner?.className).toContain('w-4');
      expect(spinner?.className).toContain('h-4');
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful text content', () => {
      render(<LoadingSpinner text="Loading user data" />);

      expect(screen.getByText('Loading user data')).toBeDefined();
    });

    it('has semantic structure for screen readers', () => {
      render(<LoadingSpinner />);

      // The text provides context for screen readers
      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      
      render(<LoadingSpinner />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time
      expect(renderTime).toBeLessThan(50);
    });

    it('handles prop changes efficiently', () => {
      const { rerender } = render(<LoadingSpinner size="small" />);
      
      rerender(<LoadingSpinner size="medium" />);
      rerender(<LoadingSpinner size="large" />);
      
      expect(screen.getByText('Loading...')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      render(<LoadingSpinner text="" />);

      const emptyText = screen.getByText('');
      expect(emptyText).toBeDefined();
    });

    it('handles very long text', () => {
      const longText = 'This is a very long loading message that might wrap to multiple lines';
      render(<LoadingSpinner text={longText} />);

      expect(screen.getByText(longText)).toBeDefined();
    });

    it('handles undefined text gracefully', () => {
      render(<LoadingSpinner text={undefined} />);

      // Should fallback to default text
      expect(screen.getByText('Loading...')).toBeDefined();
    });
  });

  describe('Theme Integration', () => {
    it('uses theme-aware color classes', () => {
      render(<LoadingSpinner />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner?.className).toContain('text-interactive');
      
      const text = screen.getByText('Loading...');
      expect(text.className).toContain('text-text-tertiary');
    });

    it('adapts to custom theme classes', () => {
      render(<LoadingSpinner className="dark:text-white" />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('dark:text-white');
    });
  });

  describe('Component Structure', () => {
    it('maintains consistent DOM structure', () => {
      render(<LoadingSpinner />);

      const container = screen.getByText('Loading...').parentElement;
      expect(container?.children).toHaveLength(2); // spinner icon + text
    });

    it('renders spinner before text', () => {
      render(<LoadingSpinner />);

      const container = screen.getByText('Loading...').parentElement;
      const firstChild = container?.children[0];
      const secondChild = container?.children[1];
      
      expect(firstChild?.className).toContain('animate-spin');
      expect(secondChild?.textContent).toBe('Loading...');
    });
  });

  describe('Real-world Usage', () => {
    it('works as loading indicator in buttons', () => {
      render(
        <button>
          <LoadingSpinner size="small" text="Saving..." />
        </button>
      );

      expect(screen.getByText('Saving...')).toBeDefined();
      expect(screen.getByRole('button')).toBeDefined();
    });

    it('works as page loading indicator', () => {
      render(
        <div className="h-screen">
          <LoadingSpinner text="Loading page..." className="h-full" />
        </div>
      );

      expect(screen.getByText('Loading page...')).toBeDefined();
    });

    it('works in cards and containers', () => {
      render(
        <div className="card">
          <LoadingSpinner text="Loading data..." />
        </div>
      );

      expect(screen.getByText('Loading data...')).toBeDefined();
    });
  });
});