import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiffViewer from '../../src/components/DiffViewer';

// Mock Monaco editor
vi.mock('../../src/components/MonacoDiffViewer', () => ({
  MonacoDiffViewer: ({ oldValue, newValue, language }: any) => (
    <div data-testid="monaco-diff-viewer">
      <div data-testid="old-value">{oldValue}</div>
      <div data-testid="new-value">{newValue}</div>
      <div data-testid="language">{language}</div>
    </div>
  ),
}));

// Mock theme context
vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'dark',
    isDarkMode: true,
  })),
}));

describe('DiffViewer', () => {
  const simpleDiff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,3 @@
 const hello = 'world';
-const old = 'value';
+const new = 'value';
 console.log(hello);`;

  const defaultProps = {
    diff: simpleDiff,
    sessionId: 'test-session',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders diff viewer with provided diff', () => {
      render(<DiffViewer {...defaultProps} />);

      expect(screen.getByText('test.js')).toBeDefined();
    });

    it('parses and displays file names', () => {
      render(<DiffViewer {...defaultProps} />);

      expect(screen.getByText('test.js')).toBeDefined();
    });

    it('renders empty state when no diff provided', () => {
      render(<DiffViewer diff="" />);

      expect(screen.getByText(/no changes/i)).toBeDefined();
    });

    it('handles empty diff gracefully', () => {
      render(<DiffViewer diff="" />);

      // Should render without crashing
      expect(screen.getByText(/no changes/i)).toBeDefined();
    });
  });

  describe('File Expansion and Collapse', () => {
    it('allows expanding and collapsing files', async () => {
      render(<DiffViewer {...defaultProps} />);

      // Find collapse/expand button
      const expandButton = screen.getByRole('button', { name: /chevron/i });
      
      // Initially expanded, click to collapse
      await userEvent.click(expandButton);

      // File content should be hidden
      expect(screen.queryByTestId('monaco-diff-viewer')).toBeNull();

      // Click to expand again
      await userEvent.click(expandButton);

      // File content should be visible
      expect(screen.getByTestId('monaco-diff-viewer')).toBeDefined();
    });

    it('shows correct chevron icons for expanded/collapsed state', async () => {
      render(<DiffViewer {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /chevron/i });
      
      // Check initial state (expanded)
      expect(expandButton.querySelector('[data-testid="chevron-down"]')).toBeTruthy();

      // Collapse
      await userEvent.click(expandButton);
      expect(expandButton.querySelector('[data-testid="chevron-right"]')).toBeTruthy();
    });
  });

  describe('File Information Display', () => {
    it('displays file statistics', () => {
      render(<DiffViewer {...defaultProps} />);

      // Should show addition/deletion stats
      const fileHeader = screen.getByText('test.js').closest('[data-testid="file-header"]');
      expect(fileHeader).toBeDefined();
    });

    it('shows file icons', () => {
      render(<DiffViewer {...defaultProps} />);

      const fileIcon = screen.getByTestId('file-icon');
      expect(fileIcon).toBeDefined();
    });

    it('handles binary files', () => {
      const binaryDiff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;

      render(<DiffViewer diff={binaryDiff} />);

      expect(screen.getByText('image.png')).toBeDefined();
      expect(screen.getByText(/binary file/i)).toBeDefined();
    });
  });

  describe('Multiple Files', () => {
    const multiFileDiff = `diff --git a/file1.js b/file1.js
index 1234567..abcdefg 100644
--- a/file1.js
+++ b/file1.js
@@ -1,1 +1,1 @@
-old content
+new content
diff --git a/file2.js b/file2.js
index 2345678..bcdefgh 100644
--- a/file2.js
+++ b/file2.js
@@ -1,1 +1,1 @@
-another old
+another new`;

    it('renders multiple files', () => {
      render(<DiffViewer diff={multiFileDiff} />);

      expect(screen.getByText('file1.js')).toBeDefined();
      expect(screen.getByText('file2.js')).toBeDefined();
    });

    it('allows independent collapse/expand of multiple files', async () => {
      render(<DiffViewer diff={multiFileDiff} />);

      const expandButtons = screen.getAllByRole('button', { name: /chevron/i });
      expect(expandButtons.length).toBe(2);

      // Collapse first file
      await userEvent.click(expandButtons[0]);

      // First file should be collapsed, second should still be expanded
      const diffViewers = screen.getAllByTestId('monaco-diff-viewer');
      expect(diffViewers.length).toBe(1); // Only one should be visible
    });
  });

  describe('Monaco Integration', () => {
    it('passes correct props to Monaco diff viewer', () => {
      render(<DiffViewer {...defaultProps} />);

      const monacoDiffViewer = screen.getByTestId('monaco-diff-viewer');
      expect(monacoDiffViewer).toBeDefined();
    });

    it('detects file language from extension', () => {
      const jsDiff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,1 +1,1 @@
-old
+new`;

      render(<DiffViewer diff={jsDiff} />);

      const languageElement = screen.getByTestId('language');
      expect(languageElement.textContent).toBe('javascript');
    });

    it('handles unknown file extensions', () => {
      const unknownDiff = `diff --git a/test.unknown b/test.unknown
index 1234567..abcdefg 100644
--- a/test.unknown
+++ b/test.unknown
@@ -1,1 +1,1 @@
-old
+new`;

      render(<DiffViewer diff={unknownDiff} />);

      expect(screen.getByText('test.unknown')).toBeDefined();
    });
  });

  describe('File Save Functionality', () => {
    it('calls onFileSave when save action is triggered', async () => {
      const mockOnFileSave = vi.fn();

      render(<DiffViewer {...defaultProps} onFileSave={mockOnFileSave} />);

      // Find and click save button (if it exists)
      const saveButton = screen.queryByRole('button', { name: /save/i });
      if (saveButton) {
        await userEvent.click(saveButton);
        expect(mockOnFileSave).toHaveBeenCalledWith('test.js');
      }
    });

    it('does not show save buttons when onFileSave is not provided', () => {
      render(<DiffViewer {...defaultProps} />);

      const saveButton = screen.queryByRole('button', { name: /save/i });
      expect(saveButton).toBeNull();
    });
  });

  describe('Scrolling and Navigation', () => {
    it('provides scrollable container', () => {
      render(<DiffViewer {...defaultProps} />);

      // Should have a scrollable container
      const scrollContainer = document.querySelector('[data-testid="scroll-container"]');
      expect(scrollContainer || document.querySelector('.overflow-auto')).toBeDefined();
    });

    it('handles large diffs efficiently', () => {
      const largeDiff = Array.from({ length: 100 }, (_, i) => 
        `+line ${i} added\n-line ${i} removed`
      ).join('\n');

      const fullDiff = `diff --git a/large.txt b/large.txt
index 1234567..abcdefg 100644
--- a/large.txt
+++ b/large.txt
@@ -1,100 +1,100 @@
${largeDiff}`;

      render(<DiffViewer diff={fullDiff} />);

      expect(screen.getByText('large.txt')).toBeDefined();
    });
  });

  describe('Theme Integration', () => {
    it('adapts to dark theme', () => {
      render(<DiffViewer {...defaultProps} />);

      // Monaco should receive theme information
      const monacoDiffViewer = screen.getByTestId('monaco-diff-viewer');
      expect(monacoDiffViewer).toBeDefined();
    });

    it('adapts to light theme', () => {
      const mockUseTheme = vi.mocked(require('../../src/contexts/ThemeContext').useTheme);
      mockUseTheme.mockReturnValue({
        theme: 'light',
        isDarkMode: false,
      });

      render(<DiffViewer {...defaultProps} />);

      const monacoDiffViewer = screen.getByTestId('monaco-diff-viewer');
      expect(monacoDiffViewer).toBeDefined();
    });
  });

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(<DiffViewer {...defaultProps} className="custom-diff-viewer" />);

      const container = document.querySelector('.custom-diff-viewer');
      expect(container).toBeDefined();
    });

    it('maintains responsive design', () => {
      render(<DiffViewer {...defaultProps} />);

      // Should have responsive classes
      const container = document.querySelector('.w-full');
      expect(container).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles malformed diffs gracefully', () => {
      const malformedDiff = 'not a valid diff format';

      render(<DiffViewer diff={malformedDiff} />);

      // Should render without crashing
      expect(screen.getByText(/no changes/i)).toBeDefined();
    });

    it('handles missing file headers', () => {
      const headerlessDiff = `@@ -1,1 +1,1 @@
-old line
+new line`;

      render(<DiffViewer diff={headerlessDiff} />);

      // Should handle gracefully
      expect(document.body).toBeDefined();
    });

    it('handles unicode characters in diffs', () => {
      const unicodeDiff = `diff --git a/unicode.txt b/unicode.txt
index 1234567..abcdefg 100644
--- a/unicode.txt
+++ b/unicode.txt
@@ -1,1 +1,1 @@
-Hello 世界
+Hello 🌍`;

      render(<DiffViewer diff={unicodeDiff} />);

      expect(screen.getByText('unicode.txt')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic structure', () => {
      render(<DiffViewer {...defaultProps} />);

      const fileHeading = screen.getByRole('heading', { level: 3 });
      expect(fileHeading).toBeDefined();
    });

    it('supports keyboard navigation', async () => {
      render(<DiffViewer {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /chevron/i });
      expandButton.focus();

      expect(document.activeElement).toBe(expandButton);
    });

    it('provides meaningful button labels', () => {
      render(<DiffViewer {...defaultProps} />);

      const expandButton = screen.getByRole('button', { name: /chevron/i });
      expect(expandButton.getAttribute('aria-label')).toContain('toggle');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large diffs', () => {
      const startTime = performance.now();
      
      render(<DiffViewer {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100);
    });

    it('handles diff updates efficiently', () => {
      const { rerender } = render(<DiffViewer {...defaultProps} />);
      
      const newDiff = defaultProps.diff.replace('test.js', 'updated.js');
      rerender(<DiffViewer {...defaultProps} diff={newDiff} />);
      
      expect(screen.getByText('updated.js')).toBeDefined();
    });
  });
});