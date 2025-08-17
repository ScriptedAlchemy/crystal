import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/ui/Button';

describe('Button', () => {
  describe('Basic Rendering', () => {
    it('renders button with text', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeDefined();
    });

    it('renders as button element by default', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('handles children content', () => {
      render(
        <Button>
          <span>Icon</span>
          Text content
        </Button>
      );

      expect(screen.getByText('Icon')).toBeDefined();
      expect(screen.getByText('Text content')).toBeDefined();
    });
  });

  describe('Variants', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-interactive');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-surface-secondary');
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-danger');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
    });



    it('defaults to primary variant', () => {
      render(<Button>Default</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-interactive');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('text-sm');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('py-1.5');
    });

    it('renders medium size (default)', () => {
      render(<Button size="md">Medium</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('py-3');
    });

    it('defaults to medium size', () => {
      render(<Button>Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
    });
  });

  describe('States', () => {
    it('renders disabled state', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
      expect(button.className).toContain('disabled:opacity-50');
    });

    it('renders loading state', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
      expect(screen.getByTestId('loading-spinner')).toBeDefined();
    });

    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);

      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner.className).toContain('animate-spin');
    });

    it('hides original content when loading', () => {
      render(<Button loading>Original Text</Button>);

      // Original text should be hidden but loading spinner should be visible
      expect(screen.getByTestId('loading-spinner')).toBeDefined();
      const button = screen.getByRole('button');
      expect(button.textContent).not.toContain('Original Text');
    });
  });

  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const mockClick = vi.fn();
      render(<Button onClick={mockClick}>Clickable</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const mockClick = vi.fn();
      render(<Button onClick={mockClick} disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const mockClick = vi.fn();
      render(<Button onClick={mockClick} loading>Loading</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockClick).not.toHaveBeenCalled();
    });

    it('supports keyboard activation', async () => {
      const mockClick = vi.fn();
      render(<Button onClick={mockClick}>Keyboard</Button>);

      const button = screen.getByRole('button');
      button.focus();
      
      await userEvent.keyboard('{Enter}');
      expect(mockClick).toHaveBeenCalledTimes(1);

      await userEvent.keyboard(' ');
      expect(mockClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('preserves default classes with custom ones', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('rounded');
      expect(button.className).toContain('custom-class');
    });

    it('allows style overrides', () => {
      render(<Button style={{ color: 'red' }}>Styled</Button>);

      const button = screen.getByRole('button');
      expect(button.style.color).toBe('red');
    });
  });

  describe('HTML Attributes', () => {
    it('forwards HTML attributes', () => {
      render(<Button type="submit" id="submit-btn">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('submit');
      expect(button.getAttribute('id')).toBe('submit-btn');
    });

    it('supports form attributes', () => {
      render(<Button form="my-form" formAction="/submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button.getAttribute('form')).toBe('my-form');
      expect(button.getAttribute('formaction')).toBe('/submit');
    });

    it('supports ARIA attributes', () => {
      render(
        <Button aria-label="Close dialog" aria-describedby="help-text">
          ×
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Close dialog');
      expect(button.getAttribute('aria-describedby')).toBe('help-text');
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<Button>Accessible</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('is focusable by default', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('is not focusable when disabled', () => {
      render(<Button disabled>Not Focusable</Button>);

      const button = screen.getByRole('button');
      expect(button.tabIndex).toBe(-1);
    });

    it('announces loading state to screen readers', () => {
      render(<Button loading aria-label="Saving changes">Save</Button>);

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('Icon Support', () => {
    it('renders with icon', () => {
      render(
        <Button>
          <span data-testid="icon">📁</span>
          Open File
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeDefined();
      expect(screen.getByText('Open File')).toBeDefined();
    });

    it('renders icon-only button', () => {
      render(
        <Button aria-label="Settings">
          <span data-testid="settings-icon">⚙️</span>
        </Button>
      );

      expect(screen.getByTestId('settings-icon')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      
      render(<Button>Performance Test</Button>);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(20);
    });

    it('handles rapid state changes', () => {
      const { rerender } = render(<Button>Initial</Button>);
      
      rerender(<Button loading>Loading</Button>);
      rerender(<Button disabled>Disabled</Button>);
      rerender(<Button variant="danger">Danger</Button>);
      
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<Button>{''}</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('handles null children', () => {
      render(<Button>{null}</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('handles boolean children', () => {
      render(<Button>{false}</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDefined();
    });

    it('handles multiple click handlers', async () => {
      const mockClick1 = vi.fn();
      const mockClick2 = vi.fn();

      render(
        <Button
          onClick={(e) => {
            mockClick1(e);
            mockClick2(e);
          }}
        >
          Multiple Handlers
        </Button>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockClick1).toHaveBeenCalledTimes(1);
      expect(mockClick2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Integration', () => {
    it('submits form when type is submit', () => {
      const mockSubmit = vi.fn((e) => e.preventDefault());
      
      render(
        <form onSubmit={mockSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      );

      const button = screen.getByRole('button');
      button.click();

      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it('resets form when type is reset', () => {
      render(
        <form>
          <input defaultValue="test" />
          <Button type="reset">Reset Form</Button>
        </form>
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      const button = screen.getByRole('button');
      
      expect(input.value).toBe('test');
      
      button.click();
      
      expect(input.value).toBe('');
    });
  });
});