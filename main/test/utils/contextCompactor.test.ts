import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgrammaticCompactor } from '../../src/utils/contextCompactor';
import { DatabaseService } from '../../src/database/database';
import type { Session, SessionOutput, ConversationMessage, PromptMarker, ExecutionDiff } from '../../src/database/models';

// Mock the database service
vi.mock('../../src/database/database');

describe('ProgrammaticCompactor', () => {
  let compactor: ProgrammaticCompactor;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = {} as DatabaseService;
    compactor = new ProgrammaticCompactor(mockDb);
  });

  describe('generateSummary', () => {
    it('should generate a summary for a completed session', async () => {
      const mockSession: Session = {
        id: 'test-session',
        project_id: 1,
        name: 'Test Session',
        initial_prompt: 'Fix the bug',
        worktree_name: 'fix-bug',
        worktree_path: '/test/dir/worktrees/fix-bug',
        status: 'completed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        last_viewed_at: '2024-01-01T11:00:00Z',
        archived: false
      };

      const mockPromptMarkers: PromptMarker[] = [
        {
          id: 1,
          session_id: 'test-session',
          prompt_text: 'Fix the authentication bug',
          output_index: 0,
          output_line: 1,
          timestamp: '2024-01-01T10:00:00Z',
          completion_timestamp: '2024-01-01T10:05:00Z'
        }
      ];

      const mockOutputs: SessionOutput[] = [
        {
          id: 1,
          session_id: 'test-session',
          type: 'json',
          data: {
            type: 'assistant',
            message: {
              content: [
                {
                  type: 'text',
                  text: 'I found the authentication bug and will fix it.'
                },
                {
                  type: 'tool_use',
                  name: 'Edit',
                  input: {
                    file_path: '/src/auth.ts'
                  }
                }
              ]
            }
          } as any, // Cast to any since SessionOutput expects string but contextCompactor expects parsed object
          timestamp: '2024-01-01T10:02:00Z'
        }
      ];

      const mockDiffs: ExecutionDiff[] = [
        {
          id: 1,
          session_id: 'test-session',
          execution_sequence: 1,
          git_diff: 'diff --git a/src/auth.ts...',
          stats_files_changed: 1,
          stats_additions: 5,
          stats_deletions: 2,
          timestamp: '2024-01-01T10:05:00Z'
        }
      ];

      const mockConversationMessages: ConversationMessage[] = [];

      const summary = await compactor.generateSummary('test-session', {
        session: mockSession,
        conversationMessages: mockConversationMessages,
        promptMarkers: mockPromptMarkers,
        executionDiffs: mockDiffs,
        sessionOutputs: mockOutputs
      });

      expect(summary).toContain('<session_context>');
      expect(summary).toContain('Call #1:');
      expect(summary).toContain('Fix the authentication bug');
      expect(summary).toContain('I found the authentication bug and will fix it.');
      expect(summary).toContain('Files modified: /src/auth.ts');
      expect(summary).toContain('Status: Completed');
      expect(summary).toContain('Duration: 5m 0s');
      expect(summary).toContain('### Files Modified (1 total)');
      expect(summary).toContain('`/src/auth.ts` - Modified (1 changes)');
      expect(summary).toContain('### Git Status');
      expect(summary).toContain('Files Changed**: 1');
      expect(summary).toContain('Additions**: +5');
      expect(summary).toContain('Deletions**: -2');
      expect(summary).toContain('</session_context>');
    });

    it('should handle interrupted sessions', async () => {
      const mockSession: Session = {
        id: 'test-session',
        project_id: 1,
        name: 'Test Session',
        initial_prompt: 'Fix the bug',
        worktree_name: 'fix-bug',
        worktree_path: '/test/dir/worktrees/fix-bug',
        status: 'failed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:30:00Z',
        last_viewed_at: '2024-01-01T10:30:00Z',
        archived: false
      };

      const mockPromptMarkers: PromptMarker[] = [
        {
          id: 1,
          session_id: 'test-session',
          prompt_text: 'Fix the authentication bug',
          output_index: 0,
          output_line: 1,
          timestamp: '2024-01-01T10:00:00Z',
          completion_timestamp: undefined // Not completed
        }
      ];

      const summary = await compactor.generateSummary('test-session', {
        session: mockSession,
        conversationMessages: [],
        promptMarkers: mockPromptMarkers,
        executionDiffs: [],
        sessionOutputs: []
      });

      expect(summary).toContain('Status: Interrupted');
      expect(summary).toContain('### ⚠️ Session Interrupted');
      expect(summary).toContain('The session was interrupted while working on the last prompt');
    });

    it('should extract and display todos', async () => {
      const mockSession: Session = {
        id: 'test-session',
        project_id: 1,
        name: 'Test Session',
        initial_prompt: 'Add feature',
        worktree_name: 'add-feature',
        worktree_path: '/test/dir/worktrees/add-feature',
        status: 'completed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        last_viewed_at: '2024-01-01T11:00:00Z',
        archived: false
      };

      const mockOutputs: SessionOutput[] = [
        {
          id: 1,
          session_id: 'test-session',
          type: 'json',
          data: {
            type: 'assistant',
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'TodoWrite',
                  input: {
                    todos: [
                      { content: 'Implement user authentication', status: 'completed' },
                      { content: 'Add password reset functionality', status: 'in_progress' },
                      { content: 'Write unit tests', status: 'pending' },
                      { content: 'Update documentation', status: 'pending' }
                    ]
                  }
                }
              ]
            }
          } as any,
          timestamp: '2024-01-01T10:10:00Z'
        }
      ];

      const summary = await compactor.generateSummary('test-session', {
        session: mockSession,
        conversationMessages: [],
        promptMarkers: [],
        executionDiffs: [],
        sessionOutputs: mockOutputs
      });

      expect(summary).toContain('### Task Status');
      expect(summary).toContain('**Completed**: 1');
      expect(summary).toContain('**In Progress**: 1');
      expect(summary).toContain('**Pending**: 2');
      expect(summary).toContain('**Currently Working On**:');
      expect(summary).toContain('Add password reset functionality');
      expect(summary).toContain('**Next Tasks**:');
      expect(summary).toContain('Write unit tests');
      expect(summary).toContain('Update documentation');
    });

    it('should handle multiple file modifications', async () => {
      const mockSession: Session = {
        id: 'test-session',
        project_id: 1,
        name: 'Test Session',
        initial_prompt: 'Refactor code',
        worktree_name: 'refactor',
        worktree_path: '/test/dir/worktrees/refactor',
        status: 'completed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        last_viewed_at: '2024-01-01T11:00:00Z',
        archived: false
      };

      const mockOutputs: SessionOutput[] = [
        {
          id: 1,
          session_id: 'test-session',
          type: 'json',
          data: {
            type: 'assistant',
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Write',
                  input: { file_path: '/src/new-file.ts' }
                }
              ]
            }
          } as any,
          timestamp: '2024-01-01T10:05:00Z'
        },
        {
          id: 2,
          session_id: 'test-session',
          type: 'json',
          data: {
            type: 'assistant',
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'Edit',
                  input: { file_path: '/src/existing.ts' }
                }
              ]
            }
          } as any,
          timestamp: '2024-01-01T10:10:00Z'
        },
        {
          id: 3,
          session_id: 'test-session',
          type: 'json',
          data: {
            type: 'assistant',
            message: {
              content: [
                {
                  type: 'tool_use',
                  name: 'MultiEdit',
                  input: {
                    file_path: '/src/existing.ts',
                    edits: [{}, {}, {}] // 3 edits
                  }
                }
              ]
            }
          } as any,
          timestamp: '2024-01-01T10:15:00Z'
        }
      ];

      const summary = await compactor.generateSummary('test-session', {
        session: mockSession,
        conversationMessages: [],
        promptMarkers: [],
        executionDiffs: [],
        sessionOutputs: mockOutputs
      });

      expect(summary).toContain('### Files Modified (2 total)');
      expect(summary).toContain('`/src/existing.ts` - Modified (4 changes)'); // 1 edit + 3 multi-edits
      expect(summary).toContain('`/src/new-file.ts` - Created (1 changes)');
    });

    it('should handle sessions with no activity', async () => {
      const mockSession: Session = {
        id: 'test-session',
        project_id: 1,
        name: 'Empty Session',
        initial_prompt: 'Do nothing',
        worktree_name: 'empty',
        worktree_path: '/test/dir/worktrees/empty',
        status: 'completed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        last_viewed_at: '2024-01-01T10:00:00Z',
        archived: false
      };

      const summary = await compactor.generateSummary('test-session', {
        session: mockSession,
        conversationMessages: [],
        promptMarkers: [],
        executionDiffs: [],
        sessionOutputs: []
      });

      expect(summary).toContain('<session_context>');
      expect(summary).toContain('### Git Status');
      expect(summary).toContain('Files Changed**: 0');
      expect(summary).not.toContain('### Files Modified');
      expect(summary).not.toContain('### Task Status');
      expect(summary).not.toContain('### ⚠️ Session Interrupted');
      expect(summary).toContain('</session_context>');
    });
  });
});