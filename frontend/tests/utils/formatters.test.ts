import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDistanceToNow, formatJsonForWeb } from '../../src/utils/formatters';

// Mock the timestamp utilities
vi.mock('../../src/utils/timestampUtils', () => ({
  formatDistanceToNow: vi.fn((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now ago';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }),
  formatForDisplay: vi.fn((timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString();
  })
}));

describe('formatters utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15 12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDistanceToNow', () => {
    test('should remove "ago" suffix from timestamp utility result', () => {
      const recentDate = new Date('2024-01-15 11:50:00Z'); // 10 minutes ago
      const result = formatDistanceToNow(recentDate);
      expect(result).toBe('10 minutes'); // "ago" should be removed
    });

    test('should handle just now case', () => {
      const veryRecentDate = new Date('2024-01-15 11:59:30Z'); // 30 seconds ago
      const result = formatDistanceToNow(veryRecentDate);
      expect(result).toBe('just now'); // "ago" should be removed
    });

    test('should handle single minute', () => {
      const oneMinuteAgo = new Date('2024-01-15 11:59:00Z');
      const result = formatDistanceToNow(oneMinuteAgo);
      expect(result).toBe('1 minute');
    });

    test('should handle hours', () => {
      const twoHoursAgo = new Date('2024-01-15 10:00:00Z');
      const result = formatDistanceToNow(twoHoursAgo);
      expect(result).toBe('2 hours');
    });

    test('should handle days', () => {
      const threeDaysAgo = new Date('2024-01-12 12:00:00Z');
      const result = formatDistanceToNow(threeDaysAgo);
      expect(result).toBe('3 days');
    });
  });

  describe('formatJsonForWeb', () => {
    test('should format system init message', () => {
      const message = {
        type: 'system',
        subtype: 'init',
        session_id: 'test-session-123',
        tools: ['bash', 'read', 'write'],
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('🚀 Claude Code Session Started');
      expect(result).toContain('Session ID: test-session-123');
      expect(result).toContain('Available tools: bash, read, write');
      expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2}.*\]/); // Should include timestamp
    });

    test('should format system result message', () => {
      const message = {
        type: 'system',
        subtype: 'result',
        duration_ms: 5000,
        cost_usd: 0.05,
        num_turns: 3,
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('📊 Session Complete');
      expect(result).toContain('Duration: 5000ms');
      expect(result).toContain('Cost: $0.05');
      expect(result).toContain('Turns: 3');
    });

    test('should handle system result with missing optional fields', () => {
      const message = {
        type: 'system',
        subtype: 'result',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('📊 Session Complete');
      expect(result).toContain('Duration: unknown');
      expect(result).toContain('Cost: free');
      expect(result).toContain('Turns: 0');
    });

    test('should format generic system message', () => {
      const message = {
        type: 'system',
        subtype: 'custom',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('⚙️  System: custom');
    });

    test('should format user message with text content', () => {
      const message = {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'Please help me with this task' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('👤 USER PROMPT');
      expect(result).toContain('Please help me with this task');
    });

    test('should format user message with string content', () => {
      const message = {
        type: 'user',
        message: {
          content: 'Simple string content'
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('👤 USER PROMPT');
      expect(result).toContain('Simple string content');
    });

    test('should format user message with tool result', () => {
      const message = {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'Here is the output:' },
            { type: 'tool_result', content: 'File contents here' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('👤 USER PROMPT');
      expect(result).toContain('Here is the output:');
      expect(result).toContain('Tool result: File contents here');
    });

    test('should skip user message with no content', () => {
      const message = {
        type: 'user',
        message: {
          content: []
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      expect(result).toBe('');
    });

    test('should format assistant message with text content', () => {
      const message = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'I can help you with that task' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('🤖 Assistant Response');
      expect(result).toContain('I can help you with that task');
    });

    test('should format assistant message with tool use', () => {
      const message = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me read the file' },
            { type: 'tool_use', name: 'read', id: 'tool_123' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('🤖 Assistant Response');
      expect(result).toContain('Let me read the file');
      expect(result).toContain('[Using tool: read]');
    });

    test('should format assistant message with string content', () => {
      const message = {
        type: 'assistant',
        message: {
          content: 'Direct string response'
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('🤖 Assistant Response');
      expect(result).toContain('Direct string response');
    });

    test('should skip assistant message with no content', () => {
      const message = {
        type: 'assistant',
        message: {
          content: []
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      expect(result).toBe('');
    });

    test('should format thinking message', () => {
      const message = {
        type: 'thinking',
        thinking: 'Let me think about this problem...',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('💭 Thinking...');
      expect(result).toContain('Let me think about this problem...');
    });

    test('should format generic message type', () => {
      const message = {
        type: 'custom',
        subtype: 'special',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('📄 custom: special');
    });

    test('should handle missing timestamp', () => {
      const message = {
        type: 'system',
        subtype: 'init'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('🚀 Claude Code Session Started');
      expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2}.*\]/); // Should still have a timestamp
    });

    test('should handle complex mixed content arrays', () => {
      const message = {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'First text' },
            { type: 'tool_result', content: 'Tool output' },
            { type: 'text', text: 'Second text' },
            { type: 'unknown', data: 'something' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('👤 USER PROMPT');
      expect(result).toContain('First text');
      expect(result).toContain('Tool result: Tool output');
      expect(result).toContain('Second text');
      expect(result).toContain('{"data":"something"}'); // Unknown types are JSON stringified
    });

    test('should handle empty thinking content', () => {
      const message = {
        type: 'thinking',
        thinking: '',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('💭 Thinking...');
    });

    test('should format system init without tools', () => {
      const message = {
        type: 'system',
        subtype: 'init',
        session_id: 'test-session',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      
      expect(result).toContain('Available tools: none');
    });
  });

  describe('edge cases', () => {
    test('should handle null/undefined message content', () => {
      const message = {
        type: 'user',
        message: {
          content: null
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      expect(result).toBe('');
    });

    test('should handle message without message property', () => {
      const message = {
        type: 'user',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      expect(result).toBe('');
    });

    test('should handle empty tools array', () => {
      const message = {
        type: 'system',
        subtype: 'init',
        session_id: 'test-session',
        tools: [],
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      expect(result).toContain('Available tools: none');
    });

    test('should handle malformed content structure', () => {
      const message = {
        type: 'assistant',
        message: {
          content: {
            malformed: 'structure'
          }
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForWeb(message);
      expect(result).toBe(''); // Should not crash and return empty
    });
  });
});