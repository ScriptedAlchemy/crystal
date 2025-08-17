import { describe, test, expect, vi } from 'vitest';
import { sanitizeHtml, sanitizeGitOutput } from '../../src/utils/sanitizer';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input: string) => {
      // Simple mock that removes script tags and dangerous attributes
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/\s*on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
    })
  }
}));

describe('sanitizer utilities', () => {
  describe('sanitizeHtml', () => {
    test('should remove script tags', () => {
      const dirty = '<div>Safe content</div><script>alert("xss")</script>';
      const result = sanitizeHtml(dirty);
      expect(result).toBe('<div>Safe content</div>');
    });

    test('should preserve safe HTML tags', () => {
      const safe = '<div class="test"><span style="color: red;">Safe content</span></div>';
      const result = sanitizeHtml(safe);
      expect(result).toBe(safe);
    });

    test('should remove dangerous event handlers', () => {
      const dangerous = '<div onclick="alert(\'xss\')">Click me</div>';
      const result = sanitizeHtml(dangerous);
      expect(result).toBe('<div>Click me</div>');
    });

    test('should remove javascript: URLs', () => {
      const dangerous = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = sanitizeHtml(dangerous);
      expect(result).toBe('<a href="">Link</a>');
    });

    test('should handle empty string', () => {
      const result = sanitizeHtml('');
      expect(result).toBe('');
    });

    test('should handle plain text', () => {
      const text = 'Just plain text with no HTML';
      const result = sanitizeHtml(text);
      expect(result).toBe(text);
    });

    test('should preserve allowed style properties', () => {
      const styled = '<span style="color: blue; background-color: white; font-weight: bold;">Styled text</span>';
      const result = sanitizeHtml(styled);
      expect(result).toBe(styled);
    });

    test('should preserve code and pre tags', () => {
      const code = '<pre><code class="language-js">const x = 1;</code></pre>';
      const result = sanitizeHtml(code);
      expect(result).toBe(code);
    });

    test('should preserve basic formatting tags', () => {
      const formatted = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const result = sanitizeHtml(formatted);
      expect(result).toBe(formatted);
    });
  });

  describe('sanitizeGitOutput', () => {
    test('should escape HTML entities', () => {
      const output = 'Error: <script>alert("xss")</script>';
      const result = sanitizeGitOutput(output);
      expect(result).toBe('Error: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should escape ampersands', () => {
      const output = 'Error: Command failed & exited';
      const result = sanitizeGitOutput(output);
      expect(result).toBe('Error: Command failed &amp; exited');
    });

    test('should escape less than and greater than signs', () => {
      const output = 'if (x < 5 && y > 10)';
      const result = sanitizeGitOutput(output);
      expect(result).toBe('if (x &lt; 5 &amp;&amp; y &gt; 10)');
    });

    test('should escape quotes', () => {
      const output = 'Error: "invalid argument"';
      const result = sanitizeGitOutput(output);
      expect(result).toBe('Error: &quot;invalid argument&quot;');
    });

    test('should escape single quotes', () => {
      const output = "Error: 'file not found'";
      const result = sanitizeGitOutput(output);
      expect(result).toBe('Error: &#x27;file not found&#x27;');
    });

    test('should handle empty string', () => {
      const result = sanitizeGitOutput('');
      expect(result).toBe('');
    });

    test('should handle normal git output without changes', () => {
      const normalOutput = 'On branch main\nnothing to commit, working tree clean';
      const result = sanitizeGitOutput(normalOutput);
      expect(result).toBe(normalOutput);
    });

    test('should handle git diff output with symbols', () => {
      const diffOutput = '+ added line\n- removed line\n  unchanged line';
      const result = sanitizeGitOutput(diffOutput);
      expect(result).toBe(diffOutput);
    });

    test('should escape complex git error messages', () => {
      const errorOutput = 'fatal: pathspec "file<name>.txt" did not match any files';
      const result = sanitizeGitOutput(errorOutput);
      expect(result).toBe('fatal: pathspec &quot;file&lt;name&gt;.txt&quot; did not match any files');
    });

    test('should handle multiline output', () => {
      const multilineOutput = 'Line 1 with <tag>\nLine 2 with "quotes"\nLine 3 with & symbols';
      const result = sanitizeGitOutput(multilineOutput);
      expect(result).toBe('Line 1 with &lt;tag&gt;\nLine 2 with &quot;quotes&quot;\nLine 3 with &amp; symbols');
    });

    test('should handle git log output with email addresses', () => {
      const logOutput = 'Author: John Doe <john@example.com>';
      const result = sanitizeGitOutput(logOutput);
      expect(result).toBe('Author: John Doe &lt;john@example.com&gt;');
    });

    test('should handle special characters in file names', () => {
      const output = 'modified: "file with spaces & <special> chars.txt"';
      const result = sanitizeGitOutput(output);
      expect(result).toBe('modified: &quot;file with spaces &amp; &lt;special&gt; chars.txt&quot;');
    });

    test('should handle git URLs with special characters', () => {
      const output = 'remote: https://github.com/user/repo.git?param=value&other=data';
      const result = sanitizeGitOutput(output);
      expect(result).toBe('remote: https://github.com/user/repo.git?param=value&amp;other=data');
    });
  });

  describe('edge cases and security', () => {
    test('sanitizeHtml should handle nested malicious content', () => {
      const nested = '<div><script>alert(1)</script><p onclick="alert(2)">Text</p></div>';
      const result = sanitizeHtml(nested);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onclick');
    });

    test('sanitizeGitOutput should handle all HTML entities in one string', () => {
      const complex = '< > & " \' all together';
      const result = sanitizeGitOutput(complex);
      expect(result).toBe('&lt; &gt; &amp; &quot; &#x27; all together');
    });

    test('sanitizeHtml should handle malformed HTML', () => {
      const malformed = '<div><span>unclosed tags<p>nested wrongly</div>';
      const result = sanitizeHtml(malformed);
      // Should not throw an error and return sanitized content
      expect(typeof result).toBe('string');
    });

    test('sanitizeGitOutput should handle very long strings', () => {
      const longString = 'a'.repeat(10000) + '<script>alert("xss")</script>';
      const result = sanitizeGitOutput(longString);
      expect(result).toContain('&lt;script&gt;');
      expect(result.length).toBeGreaterThan(10000);
    });

    test('sanitizeHtml should handle unicode characters', () => {
      const unicode = '<div>Unicode: 🚀 测试 العربية</div>';
      const result = sanitizeHtml(unicode);
      expect(result).toBe(unicode);
    });

    test('sanitizeGitOutput should preserve unicode characters', () => {
      const unicode = 'Git commit message: 🎉 测试 العربية';
      const result = sanitizeGitOutput(unicode);
      expect(result).toBe(unicode);
    });
  });
});