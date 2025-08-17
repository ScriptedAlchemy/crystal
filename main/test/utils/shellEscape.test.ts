import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  escapeShellArg,
  buildGitCommitCommand,
  escapeShellArgs,
  buildSafeCommand
} from '../../src/utils/shellEscape';

describe('shellEscape', () => {
  let originalPlatform: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
  });

  const setPlatform = (platform: string) => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      writable: false,
      enumerable: true,
      configurable: true
    });
  };

  describe('escapeShellArg', () => {
    describe('on Unix-like systems', () => {
      beforeEach(() => {
        setPlatform('darwin');
      });

      it('should wrap simple strings in single quotes', () => {
        expect(escapeShellArg('hello')).toBe("'hello'");
      });

      it('should handle empty strings', () => {
        expect(escapeShellArg('')).toBe("''");
      });

      it('should escape single quotes properly', () => {
        expect(escapeShellArg("it's")).toBe("'it'\\''s'");
      });

      it('should handle strings with multiple single quotes', () => {
        expect(escapeShellArg("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
      });

      it('should handle special characters', () => {
        expect(escapeShellArg('$PATH')).toBe("'$PATH'");
        expect(escapeShellArg('hello\nworld')).toBe("'hello\nworld'");
        expect(escapeShellArg('test;rm -rf /')).toBe("'test;rm -rf /'");
      });
    });

    describe('on Windows', () => {
      beforeEach(() => {
        setPlatform('win32');
      });

      it('should wrap strings in double quotes', () => {
        expect(escapeShellArg('hello')).toBe('"hello"');
      });

      it('should handle empty strings', () => {
        expect(escapeShellArg('')).toBe("''");
      });

      it('should escape double quotes', () => {
        expect(escapeShellArg('say "hello"')).toBe('"say \\"hello\\""');
      });

      it('should escape backslashes', () => {
        expect(escapeShellArg('C:\\Users\\test')).toBe('"C:\\\\Users\\\\test"');
      });

      it('should handle both quotes and backslashes', () => {
        expect(escapeShellArg('C:\\Program Files\\"test"')).toBe('"C:\\\\Program Files\\\\\\"test\\""');
      });
    });
  });

  describe('buildGitCommitCommand', () => {
    describe('on Unix-like systems', () => {
      beforeEach(() => {
        setPlatform('darwin');
      });

      it('should build a proper git commit command', () => {
        const result = buildGitCommitCommand('Initial commit');
        expect(result).toContain('git commit -m');
        expect(result).toContain('Initial commit');
        expect(result).toContain('Claude Code');
        expect(result).toContain('Co-Authored-By: Claude');
      });

      it('should escape single quotes in commit message', () => {
        const result = buildGitCommitCommand("Fix: don't break things");
        expect(result).toContain("don'\\''t");
      });

      it('should handle multiline messages', () => {
        const result = buildGitCommitCommand('First line\nSecond line');
        expect(result).toContain('First line\nSecond line');
      });
    });

    describe('on Windows', () => {
      beforeEach(() => {
        setPlatform('win32');
      });

      it('should build a proper git commit command', () => {
        const result = buildGitCommitCommand('Initial commit');
        expect(result).toContain('git commit -m');
        expect(result).toContain('Initial commit');
        expect(result).toContain('Claude Code');
      });

      it('should escape double quotes', () => {
        const result = buildGitCommitCommand('Fix "bug" in code');
        expect(result).toContain('Fix \\"bug\\" in code');
      });

      it('should escape newlines', () => {
        const result = buildGitCommitCommand('First line\nSecond line');
        expect(result).toContain('First line\\nSecond line');
      });

      it('should escape backslashes', () => {
        const result = buildGitCommitCommand('Fix path\\issue');
        expect(result).toContain('Fix path\\\\issue');
      });
    });
  });

  describe('escapeShellArgs', () => {
    beforeEach(() => {
      setPlatform('darwin');
    });

    it('should escape multiple arguments', () => {
      const result = escapeShellArgs(['hello', 'world']);
      expect(result).toBe("'hello' 'world'");
    });

    it('should handle empty array', () => {
      const result = escapeShellArgs([]);
      expect(result).toBe('');
    });

    it('should escape special characters in each argument', () => {
      const result = escapeShellArgs(['$PATH', "it's", 'test;command']);
      expect(result).toBe("'$PATH' 'it'\\''s' 'test;command'");
    });
  });

  describe('buildSafeCommand', () => {
    beforeEach(() => {
      setPlatform('darwin');
    });

    it('should build command with no arguments', () => {
      const result = buildSafeCommand('ls');
      expect(result).toBe('ls');
    });

    it('should build command with single argument', () => {
      const result = buildSafeCommand('ls', '/tmp');
      expect(result).toBe("ls '/tmp'");
    });

    it('should build command with multiple arguments', () => {
      const result = buildSafeCommand('git', 'commit', '-m', 'test message');
      expect(result).toBe("git 'commit' '-m' 'test message'");
    });

    it('should escape dangerous arguments', () => {
      const result = buildSafeCommand('echo', '$(rm -rf /)');
      expect(result).toBe("echo '$(rm -rf /)'");
    });
  });
});