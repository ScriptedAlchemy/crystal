import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import React from 'react';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="child-component">Child Component</div>;
}

// Component that throws an error in useEffect
function ThrowErrorInEffect({ shouldThrow }: { shouldThrow: boolean }) {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Effect error');
    }
  }, [shouldThrow]);
  
  return <div data-testid="effect-component">Effect Component</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we expect errors
  const originalError = console.error;
  
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeDefined();
      expect(screen.getByText('Child Component')).toBeDefined();
    });

    it('renders multiple children normally', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeDefined();
      expect(screen.getByTestId('child-2')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeDefined();
      expect(screen.getByText(/test error/i)).toBeDefined();
      expect(screen.queryByTestId('child-component')).toBeNull();
    });

    it('shows error details in development mode', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error details/i)).toBeDefined();
      expect(screen.getByText(/stack trace/i)).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('hides error details in production mode', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/error details/i)).toBeNull();
      expect(screen.queryByText(/stack trace/i)).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });

    it('displays generic error message for unknown errors', () => {
      // Component that throws a non-Error object
      function ThrowNonError(): React.ReactNode {
        throw 'String error';
      }

      render(
        <ErrorBoundary>
          <ThrowNonError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeDefined();
      expect(screen.getByText(/an unexpected error occurred/i)).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('provides a retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeDefined();
    });

    it('resets error state when retry is clicked', async () => {
      let shouldThrow = true;
      
      function ConditionalError() {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="recovered-component">Recovered!</div>;
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText(/something went wrong/i)).toBeDefined();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // Change condition and click retry
      shouldThrow = false;
      await userEvent.click(retryButton);

      // Re-render with the new condition
      rerender(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('recovered-component')).toBeDefined();
    });

    it('provides reload page option for critical errors', () => {
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload page/i });
      expect(reloadButton).toBeDefined();
    });
  });

  describe('Error Reporting', () => {
    it('logs errors to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('ErrorBoundary caught an error'),
        expect.any(Error)
      );
    });

    it('reports errors to error tracking service', () => {
      // Mock error reporting
      const mockErrorReport = vi.fn();
      (window as any).electronAPI = {
        reporting: {
          reportError: mockErrorReport,
        },
      };

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockErrorReport).toHaveBeenCalledWith({
        error: expect.any(Error),
        errorInfo: expect.objectContaining({
          componentStack: expect.any(String),
        }),
      });

      (window as any).electronAPI = undefined;
    });
  });

  describe('Different Error Types', () => {
    it('handles JavaScript errors', () => {
      function ThrowJSError(): React.ReactNode {
        throw new TypeError('Type error');
      }

      render(
        <ErrorBoundary>
          <ThrowJSError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/type error/i)).toBeDefined();
    });

    it('handles async errors in effects', () => {
      // Note: Error boundaries don't catch async errors
      // This test demonstrates the limitation
      render(
        <ErrorBoundary>
          <ThrowErrorInEffect shouldThrow={true} />
        </ErrorBoundary>
      );

      // Component should still render since error boundary 
      // doesn't catch async errors
      expect(screen.getByTestId('effect-component')).toBeDefined();
    });

    it('handles network-related errors', () => {
      function ThrowNetworkError(): React.ReactNode {
        throw new Error('Network request failed');
      }

      render(
        <ErrorBoundary>
          <ThrowNetworkError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/network request failed/i)).toBeDefined();
    });
  });

  describe('Fallback UI', () => {
    it('shows user-friendly error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/oops! something went wrong/i)).toBeDefined();
      expect(screen.getByText(/we apologize for the inconvenience/i)).toBeDefined();
    });

    it('provides helpful action buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /report issue/i })).toBeDefined();
    });

    it('maintains consistent styling with the app', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeDefined();
      expect(errorContainer.className).toContain('error-boundary');
    });
  });

  describe('Component Stack', () => {
    it('captures component stack trace', () => {
      function MiddleComponent() {
        return <ThrowError shouldThrow={true} />;
      }

      function WrapperComponent() {
        return <MiddleComponent />;
      }

      render(
        <ErrorBoundary>
          <WrapperComponent />
        </ErrorBoundary>
      );

      // In development mode, should show component stack
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Re-render to trigger development mode
      const { rerender } = render(
        <ErrorBoundary>
          <WrapperComponent />
        </ErrorBoundary>
      );

      rerender(
        <ErrorBoundary>
          <WrapperComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/component stack/i)).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Prevention', () => {
    it('prevents error propagation to parent components', () => {
      const ParentComponent = () => {
        return (
          <div data-testid="parent-component">
            <ErrorBoundary>
              <ThrowError shouldThrow={true} />
            </ErrorBoundary>
            <div data-testid="sibling-component">Sibling</div>
          </div>
        );
      };

      render(<ParentComponent />);

      // Parent and sibling should still render
      expect(screen.getByTestId('parent-component')).toBeDefined();
      expect(screen.getByTestId('sibling-component')).toBeDefined();
      
      // Error should be contained
      expect(screen.getByText(/something went wrong/i)).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for error state', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeDefined();
      expect(errorAlert.getAttribute('aria-live')).toBe('assertive');
    });

    it('provides accessible button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton.getAttribute('aria-label')).toBeTruthy();
    });

    it('manages focus appropriately', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Focus should move to the error message or first action button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(document.activeElement).toBe(retryButton);
    });
  });
});