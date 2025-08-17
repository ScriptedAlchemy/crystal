import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useErrorStore } from '../../src/stores/errorStore';

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useErrorStore.setState({
      currentError: null,
    });
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Initial State', () => {
    it('should have null error initially', () => {
      const { result } = renderHook(() => useErrorStore());
      
      expect(result.current.currentError).toBeNull();
    });
  });

  describe('showError', () => {
    it('should set error with all fields', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const errorInfo = {
        title: 'Git Operation Failed',
        error: 'Failed to rebase from main',
        details: 'There are merge conflicts that need to be resolved',
        command: 'git rebase origin/main'
      };

      act(() => {
        result.current.showError(errorInfo);
      });

      expect(result.current.currentError).toEqual(errorInfo);
      expect(mockConsoleError).toHaveBeenCalledWith('[ErrorStore] Showing error:', errorInfo);
    });

    it('should set error with minimal fields', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const errorInfo = {
        error: 'Network connection failed'
      };

      act(() => {
        result.current.showError(errorInfo);
      });

      expect(result.current.currentError).toEqual(errorInfo);
      expect(mockConsoleError).toHaveBeenCalledWith('[ErrorStore] Showing error:', errorInfo);
    });

    it('should override previous error', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const firstError = {
        error: 'First error'
      };
      
      const secondError = {
        title: 'Second Error',
        error: 'Second error message',
        details: 'More details about the second error'
      };

      act(() => {
        result.current.showError(firstError);
      });

      expect(result.current.currentError).toEqual(firstError);

      act(() => {
        result.current.showError(secondError);
      });

      expect(result.current.currentError).toEqual(secondError);
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });

    it('should handle empty error object', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const emptyError = {
        error: ''
      };

      act(() => {
        result.current.showError(emptyError);
      });

      expect(result.current.currentError).toEqual(emptyError);
    });
  });

  describe('clearError', () => {
    it('should clear error when one exists', () => {
      const { result } = renderHook(() => useErrorStore());
      
      // Set an error first
      const errorInfo = {
        title: 'Test Error',
        error: 'Something went wrong',
        details: 'Test details'
      };

      act(() => {
        result.current.showError(errorInfo);
      });

      expect(result.current.currentError).toEqual(errorInfo);

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.currentError).toBeNull();
    });

    it('should handle clearing when no error exists', () => {
      const { result } = renderHook(() => useErrorStore());
      
      expect(result.current.currentError).toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.currentError).toBeNull();
    });

    it('should clear error multiple times without issues', () => {
      const { result } = renderHook(() => useErrorStore());
      
      // Set and clear multiple times
      const errorInfo = {
        error: 'Test error'
      };

      act(() => {
        result.current.showError(errorInfo);
      });

      act(() => {
        result.current.clearError();
      });

      act(() => {
        result.current.clearError();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.currentError).toBeNull();
    });
  });

  describe('Error Workflow', () => {
    it('should handle typical error display and clear workflow', () => {
      const { result } = renderHook(() => useErrorStore());
      
      // 1. Start with no error
      expect(result.current.currentError).toBeNull();

      // 2. Show git rebase error
      const gitError = {
        title: 'Git Rebase Failed',
        error: 'Cannot rebase: there are uncommitted changes',
        details: 'Please commit or stash your changes before rebasing',
        command: 'git rebase origin/main'
      };

      act(() => {
        result.current.showError(gitError);
      });

      expect(result.current.currentError).toEqual(gitError);

      // 3. User resolves and clears error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.currentError).toBeNull();

      // 4. Show different error
      const sessionError = {
        title: 'Session Creation Failed',
        error: 'Failed to create Claude Code session',
        details: 'The directory is not a valid git repository'
      };

      act(() => {
        result.current.showError(sessionError);
      });

      expect(result.current.currentError).toEqual(sessionError);

      // 5. Clear again
      act(() => {
        result.current.clearError();
      });

      expect(result.current.currentError).toBeNull();
    });

    it('should handle rapid error changes', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const errors = [
        { error: 'Error 1' },
        { error: 'Error 2', title: 'Title 2' },
        { error: 'Error 3', details: 'Details 3' }
      ];

      // Rapid fire error changes
      act(() => {
        errors.forEach(error => {
          result.current.showError(error);
        });
      });

      // Should have the last error
      expect(result.current.currentError).toEqual(errors[2]);
      expect(mockConsoleError).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Data Types', () => {
    it('should handle git operation errors', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const gitErrors = [
        {
          title: 'Rebase Failed',
          error: 'Cannot rebase onto main',
          command: 'git rebase origin/main',
          details: 'Merge conflicts in src/components/App.tsx'
        },
        {
          title: 'Push Failed', 
          error: 'Permission denied',
          command: 'git push origin feature-branch'
        },
        {
          title: 'Pull Failed',
          error: 'Network timeout',
          command: 'git pull origin main',
          details: 'Unable to connect to remote repository'
        }
      ];

      gitErrors.forEach(gitError => {
        act(() => {
          result.current.showError(gitError);
        });
        
        expect(result.current.currentError).toEqual(gitError);
        
        act(() => {
          result.current.clearError();
        });
      });
    });

    it('should handle session errors', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const sessionErrors = [
        {
          title: 'Session Creation Failed',
          error: 'Failed to create worktree',
          details: 'Branch already exists'
        },
        {
          title: 'Claude Connection Failed',
          error: 'Unable to start Claude Code instance',
          details: 'Check if Claude Code is installed and in PATH'
        },
        {
          error: 'Session timeout',
          details: 'The session did not respond within the expected time'
        }
      ];

      sessionErrors.forEach(sessionError => {
        act(() => {
          result.current.showError(sessionError);
        });
        
        expect(result.current.currentError).toEqual(sessionError);
      });
    });

    it('should handle API errors', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const apiError = {
        title: 'API Request Failed',
        error: 'HTTP 500: Internal Server Error',
        details: 'The server encountered an unexpected condition that prevented it from fulfilling the request'
      };

      act(() => {
        result.current.showError(apiError);
      });

      expect(result.current.currentError).toEqual(apiError);
    });

    it('should handle validation errors', () => {
      const { result } = renderHook(() => useErrorStore());
      
      const validationError = {
        title: 'Invalid Input',
        error: 'Prompt cannot be empty',
        details: 'Please enter a prompt to create a session'
      };

      act(() => {
        result.current.showError(validationError);
      });

      expect(result.current.currentError).toEqual(validationError);
    });
  });

  describe('Store State Persistence', () => {
    it('should maintain error state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useErrorStore());
      const { result: result2 } = renderHook(() => useErrorStore());
      
      const errorInfo = {
        title: 'Shared Error',
        error: 'This error should be visible in both hooks'
      };

      act(() => {
        result1.current.showError(errorInfo);
      });

      expect(result1.current.currentError).toEqual(errorInfo);
      expect(result2.current.currentError).toEqual(errorInfo);

      act(() => {
        result2.current.clearError();
      });

      expect(result1.current.currentError).toBeNull();
      expect(result2.current.currentError).toBeNull();
    });
  });
});