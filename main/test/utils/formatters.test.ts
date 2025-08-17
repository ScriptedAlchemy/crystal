import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatJsonForOutput } from '../../src/utils/formatters';

describe('formatters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatJsonForOutput', () => {
    describe('system messages', () => {
      it('should format init system message', () => {
        const message = {
          type: 'system',
          subtype: 'init',
          timestamp: '2024-01-01T12:00:00.000Z',
          session_id: 'test-session-123',
          tools: ['bash', 'read', 'write']
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('🚀 Claude Code Session Started');
        expect(result).toContain('test-session-123');
        expect(result).toContain('bash, read, write');
      });

      it('should handle init message without tools', () => {
        const message = {
          type: 'system',
          subtype: 'init',
          session_id: 'test-session-123'
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('Available tools: none');
      });

      it('should format result system message', () => {
        const message = {
          type: 'system',
          subtype: 'result',
          duration_ms: 5000,
          cost_usd: 0.05,
          num_turns: 3
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('📊 Session Complete');
        expect(result).toContain('Duration: 5000ms');
        expect(result).toContain('Cost: $0.05');
        expect(result).toContain('Turns: 3');
      });

      it('should handle result message with missing fields', () => {
        const message = {
          type: 'system',
          subtype: 'result'
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('Duration: unknown');
        expect(result).toContain('Cost: free');
        expect(result).toContain('Turns: 0');
      });

      it('should format generic system message', () => {
        const message = {
          type: 'system',
          subtype: 'other'
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('⚙️  System: other');
      });
    });

    describe('user messages', () => {
      it('should format user message with string content', () => {
        const message = {
          type: 'user',
          message: {
            content: 'Hello, Claude!'
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('👤 User Input');
        expect(result).toContain('Hello, Claude!');
      });

      it('should format user message with array content', () => {
        const message = {
          type: 'user',
          message: {
            content: [
              { type: 'text', text: 'Check this file' },
              { type: 'text', text: ' and fix bugs' }
            ]
          }
        };

        const result = formatJsonForOutput(message);
        // The formatter adds a space after each array item when joining
        expect(result).toContain('Check this file  and fix bugs');
      });

      it('should format user message with tool results', () => {
        const message = {
          type: 'user',
          message: {
            content: [
              { type: 'text', text: 'Result:' },
              {
                type: 'tool_result',
                tool_use_id: 'tool-123',
                content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12'
              }
            ]
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('Tool result: [tool-123]');
        expect(result).toContain('Line 10');
        expect(result).toContain('... (2 more lines)');
        expect(result).not.toContain('Line 11');
      });

      it('should skip user message with no content', () => {
        const message = {
          type: 'user',
          message: {}
        };

        const result = formatJsonForOutput(message);
        expect(result).toBe('');
      });
    });

    describe('assistant messages', () => {
      it('should format assistant message with text content', () => {
        const message = {
          type: 'assistant',
          message: {
            content: 'I can help you with that!'
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('🤖 Assistant Response');
        expect(result).toContain('I can help you with that!');
      });

      it('should format assistant message with array content', () => {
        const message = {
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: 'Let me analyze this.' },
              { type: 'text', text: ' I found the issue.' }
            ]
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('Let me analyze this.');
        expect(result).toContain('I found the issue.');
      });

      it('should format assistant message with tool use', () => {
        const message = {
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: 'Running a command:' },
              {
                type: 'tool_use',
                name: 'bash',
                input: {
                  command: 'ls -la',
                  timeout: 5000
                }
              }
            ]
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('Running a command:');
        expect(result).toContain('[Using tool: bash]');
        expect(result).toContain('Parameters:');
        expect(result).toContain('"command": "ls -la"');
        expect(result).toContain('"timeout": 5000');
      });

      it('should truncate long tool parameters', () => {
        const longInput = {
          data: Array(20).fill('x').map((_, i) => `line ${i + 1}`)
        };

        const message = {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'write',
                input: longInput
              }
            ]
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('[Using tool: write]');
        expect(result).toContain('... (');
        expect(result).toContain('more lines)');
      });

      it('should skip assistant message with no content', () => {
        const message = {
          type: 'assistant',
          message: {}
        };

        const result = formatJsonForOutput(message);
        expect(result).toBe('');
      });
    });

    describe('session messages', () => {
      it('should format session error message', () => {
        const message = {
          type: 'session',
          data: {
            status: 'error',
            message: 'Connection failed',
            details: 'Unable to reach Claude API'
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('❌ Session Error');
        expect(result).toContain('Connection failed');
        expect(result).toContain('Unable to reach Claude API');
      });

      it('should format session status update', () => {
        const message = {
          type: 'session',
          data: {
            status: 'connected'
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('📝 Session: connected');
      });

      it('should handle session message without data', () => {
        const message = {
          type: 'session'
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('📝 Session: update');
      });
    });

    describe('timestamp handling', () => {
      it('should use provided timestamp', () => {
        const message = {
          type: 'system',
          subtype: 'generic',
          timestamp: '2024-06-15T10:30:00.000Z'
        };

        const result = formatJsonForOutput(message);
        // The formatted time includes AM/PM in locale format
        expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2} [AP]M\]/);
      });

      it('should use current time for invalid timestamp', () => {
        const message = {
          type: 'system',
          subtype: 'generic',
          timestamp: 'invalid-date'
        };

        const result = formatJsonForOutput(message);
        // The formatted time includes AM/PM in locale format
        expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2} [AP]M\]/);
      });

      it('should use current time when no timestamp provided', () => {
        const message = {
          type: 'system',
          subtype: 'generic'
        };

        const result = formatJsonForOutput(message);
        // The formatted time includes AM/PM in locale format
        expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2} [AP]M\]/);
      });
    });

    describe('unknown message types', () => {
      it('should format unknown message type', () => {
        const message = {
          type: 'unknown',
          subtype: 'test'
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('📄 unknown: test');
      });

      it('should handle unknown type without subtype', () => {
        const message = {
          type: 'custom'
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('📄 custom: message');
      });
    });

    describe('ANSI escape codes', () => {
      it('should include proper ANSI color codes', () => {
        const message = {
          type: 'user',
          message: {
            content: 'Test'
          }
        };

        const result = formatJsonForOutput(message);
        expect(result).toContain('\x1b[36m'); // Cyan
        expect(result).toContain('\x1b[32m'); // Green
        expect(result).toContain('\x1b[0m');  // Reset
      });
    });
  });
});