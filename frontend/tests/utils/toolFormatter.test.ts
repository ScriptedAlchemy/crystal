import { describe, test, expect } from 'vitest';
import {
  formatToolInteraction,
  formatJsonForOutputEnhanced
} from '../../src/utils/toolFormatter';

describe('toolFormatter utilities', () => {
  describe('formatToolInteraction', () => {
    const mockToolCall = {
      type: 'tool_use' as const,
      id: 'tool_123',
      name: 'Bash',
      input: { command: 'ls -la' }
    };

    const mockToolResult = {
      type: 'tool_result' as const,
      tool_use_id: 'tool_123',
      content: 'file1.txt\nfile2.txt'
    };

    test('should format tool call without result', () => {
      const result = formatToolInteraction(
        mockToolCall,
        null,
        '2024-01-15T12:00:00Z'
      );

      expect(result).toContain('🔧 Tool: Bash');
      expect(result).toContain('$ ls -la');
      expect(result).toContain('⏳ Executing...');
      expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2}.*\]/); // Timestamp format may vary by locale
    });

    test('should format tool call with result', () => {
      const result = formatToolInteraction(
        mockToolCall,
        mockToolResult,
        '2024-01-15T12:00:00Z',
        '2024-01-15T12:00:01Z'
      );

      expect(result).toContain('🔧 Tool: Bash');
      expect(result).toContain('$ ls -la');
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
      expect(result).toContain('✓ Complete');
    });

    test('should format Grep tool with pattern', () => {
      const grepCall = {
        ...mockToolCall,
        name: 'Grep',
        input: {
          pattern: 'function.*test',
          path: '/project/src',
          include: '*.ts'
        }
      };

      const result = formatToolInteraction(grepCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Grep');
      expect(result).toContain('Pattern: "function.*test"');
      expect(result).toContain('Path: /project/src');
      expect(result).toContain('Include: *.ts');
    });

    test('should format Read tool with file path', () => {
      const readCall = {
        ...mockToolCall,
        name: 'Read',
        input: {
          file_path: '/workstation/worktrees/session-123/src/utils/test.ts',
          offset: 10,
          limit: 50
        }
      };

      const result = formatToolInteraction(readCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Read');
      expect(result).toContain('File: /src/utils/test.ts'); // Path should be relative
      expect(result).toContain('Lines: 10-60');
    });

    test('should format Edit tool', () => {
      const editCall = {
        ...mockToolCall,
        name: 'Edit',
        input: {
          file_path: '/workstation/worktrees/session-456/package.json'
        }
      };

      const result = formatToolInteraction(editCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Edit');
      expect(result).toContain('File: /package.json');
    });

    test('should format TodoWrite tool with tasks', () => {
      const todoCall = {
        ...mockToolCall,
        name: 'TodoWrite',
        input: {
          todos: [
            { content: 'Complete task 1', status: 'completed' },
            { content: 'Work on task 2', status: 'in_progress' },
            { content: 'Start task 3', status: 'pending' }
          ]
        }
      };

      const result = formatToolInteraction(todoCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: TodoWrite');
      expect(result).toContain('Tasks updated:');
      expect(result).toContain('✓ Complete task 1');
      expect(result).toContain('→ Work on task 2');
      expect(result).toContain('○ Start task 3');
    });

    test('should format Write tool with file info', () => {
      const writeCall = {
        ...mockToolCall,
        name: 'Write',
        input: {
          file_path: '/workstation/worktrees/session-789/src/new-file.ts',
          content: 'console.log("hello");\nconsole.log("world");'
        }
      };

      const result = formatToolInteraction(writeCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Write');
      expect(result).toContain('File: /src/new-file.ts');
      expect(result).toContain('Size: 2 lines');
    });

    test('should format Glob tool', () => {
      const globCall = {
        ...mockToolCall,
        name: 'Glob',
        input: {
          pattern: '**/*.test.ts',
          path: '/project'
        }
      };

      const result = formatToolInteraction(globCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Glob');
      expect(result).toContain('Pattern: **/*.test.ts');
      expect(result).toContain('Path: /project');
    });

    test('should format Task tool with description', () => {
      const taskCall = {
        ...mockToolCall,
        name: 'Task',
        input: {
          description: 'Code review assistant',
          prompt: 'Please review this code for potential issues and suggest improvements: ' + 'x'.repeat(200)
        }
      };

      const result = formatToolInteraction(taskCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Task');
      expect(result).toContain('Description: Code review assistant');
      expect(result).toContain('Prompt: Please review this code for potential issues and suggest improvements: ' + 'x'.repeat(70) + '...');
    });

    test('should format LS tool', () => {
      const lsCall = {
        ...mockToolCall,
        name: 'LS',
        input: {
          path: '/workstation/worktrees/session-999/src',
          ignore: ['node_modules', '*.log']
        }
      };

      const result = formatToolInteraction(lsCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: LS');
      expect(result).toContain('Path: /src');
      expect(result).toContain('Ignoring: node_modules, *.log');
    });

    test('should format TodoRead tool', () => {
      const todoReadCall = {
        ...mockToolCall,
        name: 'TodoRead',
        input: {}
      };

      const result = formatToolInteraction(todoReadCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: TodoRead');
      expect(result).toContain('Reading current task list...');
    });

    test('should handle empty tool input', () => {
      const emptyCall = {
        ...mockToolCall,
        input: {}
      };

      const result = formatToolInteraction(emptyCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Bash');
      expect(result).not.toContain('Parameters:');
    });

    test('should handle large tool input', () => {
      const largeCall = {
        ...mockToolCall,
        input: {
          data: JSON.stringify({ 
            lines: Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`) 
          })
        }
      };

      const result = formatToolInteraction(largeCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('🔧 Tool: Bash');
      expect(result).toContain('... (');
      expect(result).toContain('more lines)');
    });

    test('should handle error results', () => {
      const errorResult = {
        ...mockToolResult,
        content: 'Error: Command failed\nfatal: not a git repository'
      };

      const result = formatToolInteraction(
        mockToolCall,
        errorResult,
        '2024-01-15T12:00:00Z'
      );

      expect(result).toContain('✗ Failed');
      expect(result).toContain('Error: Command failed');
    });

    test('should handle grep search results', () => {
      const grepResult = {
        ...mockToolResult,
        content: 'Found 3 matches:\nfile1.ts\nfile2.ts\nfile3.ts'
      };

      const grepCall = {
        ...mockToolCall,
        name: 'Grep'
      };

      const result = formatToolInteraction(
        grepCall,
        grepResult,
        '2024-01-15T12:00:00Z'
      );

      expect(result).toContain('Found 3 matches:');
      expect(result).toContain('• file1.ts');
      expect(result).toContain('• file2.ts');
    });

    test('should handle image read results', () => {
      const imageResult = {
        ...mockToolResult,
        content: JSON.stringify([{
          type: 'image',
          source: {
            type: 'base64',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          }
        }])
      };

      const readCall = {
        ...mockToolCall,
        name: 'Read',
        input: { file_path: '/path/to/image.png' }
      };

      const result = formatToolInteraction(
        readCall,
        imageResult,
        '2024-01-15T12:00:00Z'
      );

      expect(result).toContain('[Image displayed to Claude Code]');
      expect(result).toContain('File: /path/to/image.png');
      expect(result).toContain('Size: ~');
    });

    test('should handle TodoRead results with colored output', () => {
      const todoResult = {
        ...mockToolResult,
        content: '✓ Completed task\n→ In progress task\n○ Pending task'
      };

      const todoCall = {
        ...mockToolCall,
        name: 'TodoRead'
      };

      const result = formatToolInteraction(
        todoCall,
        todoResult,
        '2024-01-15T12:00:00Z'
      );

      expect(result).toContain('Current Tasks:');
      expect(result).toMatch(/\x1b\[32m.*✓ Completed task/); // Green
      expect(result).toMatch(/\x1b\[33m.*→ In progress task/); // Yellow
    });

    test('should make paths relative', () => {
      const pathCall = {
        ...mockToolCall,
        name: 'Read',
        input: {
          file_path: '/Users/developer/projects/worktrees/feature-branch/src/component.tsx'
        }
      };

      const result = formatToolInteraction(pathCall, null, '2024-01-15T12:00:00Z');

      expect(result).toContain('File: /src/component.tsx');
      expect(result).not.toContain('/Users/developer/projects/worktrees/feature-branch');
    });
  });

  describe('formatJsonForOutputEnhanced', () => {
    test('should format assistant message with tool calls', () => {
      const message = {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'Read', input: { file_path: 'test.ts' } }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(message);

      expect(result).toContain('🔧 Tool: Read');
      expect(result).toContain('⏳ Executing...');
    });

    test('should format user message with tool results', () => {
      const toolCall = {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'Bash', input: { command: 'echo hello' } }
          ]
        },
        timestamp: '2024-01-15T11:59:00Z'
      };

      const toolResult = {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tool_1', content: 'hello' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      // First format the tool call to store it
      formatJsonForOutputEnhanced(toolCall);
      
      // Then format the result
      const result = formatJsonForOutputEnhanced(toolResult);

      expect(result).toContain('🔧 Tool: Bash');
      expect(result).toContain('$ echo hello');
      expect(result).toContain('hello');
      expect(result).toContain('✓ Complete');
    });

    test('should format assistant text content', () => {
      const message = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'I will help you with that task.' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(message);

      expect(result).toContain('🤖 Assistant');
      expect(result).toContain('I will help you with that task.');
    });

    test('should format user text content with emphasis', () => {
      const message = {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'Please review this code' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(message);

      expect(result).toContain('👤 USER PROMPT');
      expect(result).toContain('Please review this code');
      expect(result).toMatch(/\x1b\[1m\x1b\[42m\x1b\[30m.*👤 USER PROMPT/); // Bold green background
      expect(result).toMatch(/\x1b\[1m\x1b\[92m.*Please review this code/); // Bold bright green
    });

    test('should handle orphaned tool results', () => {
      const orphanedResult = {
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'unknown_tool', content: 'some output' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(orphanedResult);

      expect(result).toContain('📥 Tool Result [unknown_tool]');
      expect(result).toContain('some output');
    });

    test('should filter base64 data from orphaned results', () => {
      const orphanedResult = {
        type: 'user',
        message: {
          content: [
            { 
              type: 'tool_result', 
              tool_use_id: 'unknown_tool', 
              content: JSON.stringify({
                type: 'image',
                source: {
                  type: 'base64',
                  data: 'very-long-base64-string'
                }
              })
            }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(orphanedResult);

      expect(result).toContain('[Base64 data filtered]');
      expect(result).not.toContain('very-long-base64-string');
    });

    test('should fall back to original formatter for unknown types', () => {
      const unknownMessage = {
        type: 'unknown',
        data: 'some data',
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(unknownMessage);

      expect(result).toContain('unknown');
    });

    test('should handle mixed content arrays', () => {
      const mixedMessage = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'First, let me read the file:' },
            { type: 'tool_use', id: 'tool_1', name: 'Read', input: { file_path: 'test.ts' } },
            { type: 'text', text: 'Now let me analyze it.' }
          ]
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(mixedMessage);

      expect(result).toContain('First, let me read the file:');
      expect(result).toContain('[Using tool: Read]');
      expect(result).toContain('Now let me analyze it.');
    });

    test('should handle empty content arrays', () => {
      const emptyMessage = {
        type: 'assistant',
        message: {
          content: []
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(emptyMessage);
      expect(result).toBe('');
    });

    test('should handle string content', () => {
      const stringMessage = {
        type: 'assistant',
        message: {
          content: 'Direct string content'
        },
        timestamp: '2024-01-15T12:00:00Z'
      };

      const result = formatJsonForOutputEnhanced(stringMessage);

      expect(result).toContain('🤖 Assistant');
      expect(result).toContain('Direct string content');
    });

    test('should handle missing timestamp', () => {
      const message = {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello' }
          ]
        }
      };

      const result = formatJsonForOutputEnhanced(message);

      expect(result).toContain('🤖 Assistant');
      expect(result).toContain('Hello');
      expect(result).toMatch(/\[\d{1,2}:\d{2}:\d{2}.*\]/);
    });
  });

  describe('path relativization', () => {
    test('should handle various worktree path patterns', () => {
      const paths = [
        '/Users/dev/project/worktrees/feature-123/src/file.ts',
        '/home/user/workspace/worktrees/bugfix-456/lib/utils.js',
        'C:\\workspace\\worktrees\\feature-789\\src\\component.tsx'
      ];

      const expected = [
        '/src/file.ts',
        '/lib/utils.js',
        '\\src\\component.tsx'
      ];

      paths.forEach((path, index) => {
        const toolCall = {
          type: 'tool_use' as const,
          id: 'test',
          name: 'Read',
          input: { file_path: path }
        };

        const result = formatToolInteraction(toolCall, null, '2024-01-15T12:00:00Z');
        expect(result).toContain(expected[index]);
      });
    });

    test('should preserve paths without worktree pattern', () => {
      const toolCall = {
        type: 'tool_use' as const,
        id: 'test',
        name: 'Read',
        input: { file_path: '/regular/project/src/file.ts' }
      };

      const result = formatToolInteraction(toolCall, null, '2024-01-15T12:00:00Z');
      expect(result).toContain('/regular/project/src/file.ts');
    });
  });
});