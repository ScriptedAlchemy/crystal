import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { gitStatusLogger } from '../../src/utils/gitStatusLogger';

describe('FrontendGitStatusLogger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Clear any accumulated state
    gitStatusLogger.clearErrors();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('log method', () => {
    test('should log poll operations with count', () => {
      gitStatusLogger.log({
        operation: 'poll',
        count: 5
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] Polling 5 sessions');
    });

    test('should not log poll operations with zero count', () => {
      gitStatusLogger.log({
        operation: 'poll',
        count: 0
      });

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should not log poll operations without count', () => {
      gitStatusLogger.log({
        operation: 'poll'
      });

      expect(console.log).not.toHaveBeenCalled();
    });

    test('should log refresh operations with project name', () => {
      gitStatusLogger.log({
        operation: 'refresh',
        count: 3,
        projectName: 'TestProject'
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] Refreshed 3 sessions in project "TestProject"');
    });

    test('should log refresh operations without project name', () => {
      gitStatusLogger.log({
        operation: 'refresh',
        count: 2
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] Refreshed 2 sessions in sessions');
    });

    test('should log load operations', () => {
      gitStatusLogger.log({
        operation: 'load',
        count: 10
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] Loaded 10 sessions');
    });

    test('should not log load operations without count', () => {
      gitStatusLogger.log({
        operation: 'load'
      });

      expect(console.log).not.toHaveBeenCalled();
    });

    describe('update operations', () => {
      let originalNodeEnv: string | undefined;
      
      beforeEach(() => {
        // Mock NODE_ENV for development tests
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
      });

      afterEach(() => {
        if (originalNodeEnv !== undefined) {
          process.env.NODE_ENV = originalNodeEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      });

      test('should log non-clean states in production', () => {
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-123456789',
          state: 'dirty'
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] session-12 → dirty');
      });

      test('should not log clean states in production', () => {
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-123456789',
          state: 'clean'
        });

        expect(console.log).not.toHaveBeenCalled();
      });

      test('should log all states in development', () => {
        process.env.NODE_ENV = 'development';

        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-123456789',
          state: 'clean'
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] session-12 → clean');
      });

      test('should truncate long session IDs', () => {
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'very-long-session-id-that-should-be-truncated-12345',
          state: 'modified'
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] very-lon → modified');
      });

      test('should handle unknown session ID', () => {
        gitStatusLogger.log({
          operation: 'update',
          state: 'dirty'
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] unknown → dirty');
      });

      test('should handle missing state', () => {
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-123'
        });

        expect(console.log).not.toHaveBeenCalled();
      });
    });

    describe('throttling', () => {
      test('should throttle update operations', () => {
        const LOG_THROTTLE_MS = 1000;

        // First update should log
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-1',
          state: 'dirty'
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] session-1 → dirty');

        // Subsequent updates within throttle period should be accumulated
        for (let i = 0; i < 5; i++) {
          gitStatusLogger.log({
            operation: 'update',
            sessionId: `session-${i}`,
            state: 'modified'
          });
        }

        expect(console.log).toHaveBeenCalledTimes(1); // Only the first call

        // After throttle period, should flush accumulated updates
        vi.advanceTimersByTime(LOG_THROTTLE_MS);

        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-final',
          state: 'dirty'
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] 5 status updates (throttled)');
        expect(console.log).toHaveBeenCalledWith('[GitStatus] session-f → dirty');
      });

      test('should not throttle different operation types', () => {
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-1',
          state: 'dirty'
        });

        gitStatusLogger.log({
          operation: 'poll',
          count: 3
        });

        gitStatusLogger.log({
          operation: 'refresh',
          count: 2
        });

        expect(console.log).toHaveBeenCalledTimes(3);
      });

      test('should reset throttle counter after flush', () => {
        // First update should always log
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-0',
          state: 'modified'
        });
        
        // Accumulate some more updates
        for (let i = 1; i < 3; i++) {
          gitStatusLogger.log({
            operation: 'update',
            sessionId: `session-${i}`,
            state: 'modified'
          });
        }

        // Trigger flush with different operation
        gitStatusLogger.log({
          operation: 'poll',
          count: 1
        });

        expect(console.log).toHaveBeenCalledWith('[GitStatus] 2 status updates (throttled)');

        // New updates should start fresh count
        gitStatusLogger.log({
          operation: 'update',
          sessionId: 'session-new',
          state: 'dirty'
        });

        vi.advanceTimersByTime(1000);

        gitStatusLogger.log({
          operation: 'poll',
          count: 1
        });

        // Should not show any throttled message since count was reset
        expect(console.log).toHaveBeenLastCalledWith('[GitStatus] Polling 1 sessions');
      });
    });
  });

  describe('logError method', () => {
    test('should log first occurrence of error', () => {
      gitStatusLogger.logError('Connection failed', 'network');

      expect(console.error).toHaveBeenCalledWith('[GitStatus:network] Connection failed');
    });

    test('should deduplicate repeated errors', () => {
      const error = 'Connection timeout';
      const context = 'api';

      // Log same error multiple times
      for (let i = 0; i < 5; i++) {
        gitStatusLogger.logError(error, context);
      }

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('[GitStatus:api] Connection timeout');
    });

    test('should log every 10th occurrence', () => {
      const error = 'Repeated error';
      const context = 'test';

      // Log error 15 times
      for (let i = 0; i < 15; i++) {
        gitStatusLogger.logError(error, context);
      }

      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenNthCalledWith(1, '[GitStatus:test] Repeated error');
      expect(console.error).toHaveBeenNthCalledWith(2, '[GitStatus:test] Repeated error (10x)');
    });

    test('should handle errors without context', () => {
      gitStatusLogger.logError('Generic error');

      expect(console.error).toHaveBeenCalledWith('[GitStatus] Generic error');
    });

    test('should track different errors separately', () => {
      gitStatusLogger.logError('Error A', 'context1');
      gitStatusLogger.logError('Error B', 'context1');
      gitStatusLogger.logError('Error A', 'context2');

      expect(console.error).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context1] Error A');
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context1] Error B');
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context2] Error A');
    });

    test('should show count for repeated occurrences', () => {
      const error = 'Network error';

      // Log error 20 times to trigger multiple count displays
      for (let i = 0; i < 20; i++) {
        gitStatusLogger.logError(error, 'network');
      }

      expect(console.error).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenNthCalledWith(1, '[GitStatus:network] Network error');
      expect(console.error).toHaveBeenNthCalledWith(2, '[GitStatus:network] Network error (10x)');
    });

    test('should continue counting beyond 10', () => {
      const error = 'Persistent error';

      // Log error 25 times
      for (let i = 0; i < 25; i++) {
        gitStatusLogger.logError(error, 'test');
      }

      expect(console.error).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenNthCalledWith(3, '[GitStatus:test] Persistent error (20x)');
    });
  });

  describe('clearErrors method', () => {
    beforeEach(() => {
      // Set up some error history
      gitStatusLogger.logError('Error 1', 'context1');
      gitStatusLogger.logError('Error 2', 'context1');
      gitStatusLogger.logError('Error 3', 'context2');
      
      // Trigger repeated errors to get counts
      for (let i = 0; i < 15; i++) {
        gitStatusLogger.logError('Repeated error', 'context1');
      }
    });

    test('should clear errors for specific context', () => {
      gitStatusLogger.clearErrors('context1');

      // Errors for context1 should be reset
      gitStatusLogger.logError('Error 1', 'context1');
      gitStatusLogger.logError('Repeated error', 'context1');

      // These should log as first occurrences
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context1] Error 1');
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context1] Repeated error');

      // Errors for context2 should still be tracked
      gitStatusLogger.logError('Error 3', 'context2');
      expect(console.error).not.toHaveBeenCalledWith('[GitStatus:context2] Error 3');
    });

    test('should clear all errors when no context specified', () => {
      gitStatusLogger.clearErrors();

      // All previously logged errors should now log as first occurrences
      gitStatusLogger.logError('Error 1', 'context1');
      gitStatusLogger.logError('Error 3', 'context2');

      expect(console.error).toHaveBeenCalledWith('[GitStatus:context1] Error 1');
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context2] Error 3');
    });

    test('should handle clearing non-existent context', () => {
      expect(() => gitStatusLogger.clearErrors('nonexistent')).not.toThrow();

      // Existing errors should still be tracked
      gitStatusLogger.logError('Error 1', 'context1');
      expect(console.error).not.toHaveBeenCalledWith('[GitStatus:context1] Error 1');
    });

    test('should clear errors without context', () => {
      gitStatusLogger.logError('General error');
      gitStatusLogger.logError('General error'); // Should not log due to deduplication

      gitStatusLogger.clearErrors('general');

      gitStatusLogger.logError('General error');
      expect(console.error).toHaveBeenCalledWith('[GitStatus] General error');
    });
  });

  describe('integration scenarios', () => {
    test('should handle mixed logging and error operations', () => {
      // Regular logging
      gitStatusLogger.log({
        operation: 'poll',
        count: 5
      });

      // Error logging
      gitStatusLogger.logError('Connection failed', 'network');

      // More regular logging
      gitStatusLogger.log({
        operation: 'update',
        sessionId: 'session-1',
        state: 'dirty'
      });

      // Repeated error
      gitStatusLogger.logError('Connection failed', 'network');

      expect(console.log).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledTimes(1); // Second error was deduplicated
    });

    test('should handle rapid update logging with throttling', () => {
      // Simulate rapid git status updates
      for (let i = 0; i < 100; i++) {
        gitStatusLogger.log({
          operation: 'update',
          sessionId: `session-${i}`,
          state: 'modified'
        });
      }

      // Should accumulate without spamming console
      expect(console.log).toHaveBeenCalledTimes(1); // Only first update logs

      // After throttle period, flush with another operation
      vi.advanceTimersByTime(1000);
      gitStatusLogger.log({
        operation: 'poll',
        count: 50
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] 99 status updates (throttled)');
      expect(console.log).toHaveBeenCalledWith('[GitStatus] Polling 50 sessions');
    });

    test('should handle error recovery scenario', () => {
      // Simulate network errors
      for (let i = 0; i < 5; i++) {
        gitStatusLogger.logError('Network timeout', 'api');
      }

      expect(console.error).toHaveBeenCalledTimes(1);

      // Simulate recovery
      gitStatusLogger.clearErrors('api');

      // New operations should work normally
      gitStatusLogger.log({
        operation: 'refresh',
        count: 10,
        projectName: 'RecoveredProject'
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] Refreshed 10 sessions in project "RecoveredProject"');
    });
  });

  describe('edge cases', () => {
    test('should handle very long session IDs', () => {
      const veryLongId = 'a'.repeat(100);
      
      gitStatusLogger.log({
        operation: 'update',
        sessionId: veryLongId,
        state: 'dirty'
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] aaaaaaaa → dirty');
    });

    test('should handle empty strings', () => {
      gitStatusLogger.log({
        operation: 'update',
        sessionId: '',
        state: 'dirty'
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] unknown → dirty');

      gitStatusLogger.logError('', 'context');
      expect(console.error).toHaveBeenCalledWith('[GitStatus:context] ');
    });

    test('should handle undefined and null values', () => {
      gitStatusLogger.log({
        operation: 'update',
        sessionId: undefined,
        state: 'dirty'
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] unknown → dirty');

      gitStatusLogger.logError(null as any, undefined as any);
      expect(console.error).toHaveBeenCalledWith('[GitStatus] null');
    });

    test('should handle special characters in error messages', () => {
      const errorWithSpecialChars = 'Error: "Connection failed" & retry count exceeded';
      
      gitStatusLogger.logError(errorWithSpecialChars, 'network');
      
      expect(console.error).toHaveBeenCalledWith('[GitStatus:network] Error: "Connection failed" & retry count exceeded');
    });

    test('should handle Unicode characters', () => {
      gitStatusLogger.log({
        operation: 'refresh',
        count: 1,
        projectName: '测试项目🚀'
      });

      expect(console.log).toHaveBeenCalledWith('[GitStatus] Refreshed 1 sessions in project "测试项目🚀"');
    });
  });
});