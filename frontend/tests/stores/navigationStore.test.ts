import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNavigationStore } from '../../src/stores/navigationStore';

describe('NavigationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNavigationStore.setState({
      activeView: 'sessions',
      activeProjectId: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
    });
  });

  describe('setActiveView', () => {
    it('should set active view to sessions', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Start with project view
      act(() => {
        result.current.setActiveView('project');
      });
      
      expect(result.current.activeView).toBe('project');
      
      // Switch to sessions
      act(() => {
        result.current.setActiveView('sessions');
      });
      
      expect(result.current.activeView).toBe('sessions');
    });

    it('should set active view to project', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      expect(result.current.activeView).toBe('sessions');
      
      act(() => {
        result.current.setActiveView('project');
      });
      
      expect(result.current.activeView).toBe('project');
    });

    it('should not change activeProjectId when setting view', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Set a project ID first
      act(() => {
        result.current.setActiveProjectId(42);
      });
      
      expect(result.current.activeProjectId).toBe(42);
      
      // Change view - should not affect project ID
      act(() => {
        result.current.setActiveView('project');
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(42);
      
      act(() => {
        result.current.setActiveView('sessions');
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBe(42);
    });
  });

  describe('setActiveProjectId', () => {
    it('should set active project ID to a number', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      expect(result.current.activeProjectId).toBeNull();
      
      act(() => {
        result.current.setActiveProjectId(123);
      });
      
      expect(result.current.activeProjectId).toBe(123);
    });

    it('should set active project ID to null', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Set a project ID first
      act(() => {
        result.current.setActiveProjectId(456);
      });
      
      expect(result.current.activeProjectId).toBe(456);
      
      // Clear it
      act(() => {
        result.current.setActiveProjectId(null);
      });
      
      expect(result.current.activeProjectId).toBeNull();
    });

    it('should change project ID without affecting view', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Set view to project
      act(() => {
        result.current.setActiveView('project');
      });
      
      expect(result.current.activeView).toBe('project');
      
      // Change project ID
      act(() => {
        result.current.setActiveProjectId(789);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(789);
    });

    it('should handle multiple project ID changes', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      const projectIds = [1, 2, 3, null, 4, null];
      
      projectIds.forEach(projectId => {
        act(() => {
          result.current.setActiveProjectId(projectId);
        });
        
        expect(result.current.activeProjectId).toBe(projectId);
      });
    });
  });

  describe('navigateToProject', () => {
    it('should set both view and project ID', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
      
      act(() => {
        result.current.navigateToProject(555);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(555);
    });

    it('should override existing state', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Set some initial state
      act(() => {
        result.current.setActiveView('sessions');
        result.current.setActiveProjectId(111);
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBe(111);
      
      // Navigate to different project
      act(() => {
        result.current.navigateToProject(222);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(222);
    });

    it('should handle multiple project navigations', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      const projects = [1, 42, 999, 1];
      
      projects.forEach(projectId => {
        act(() => {
          result.current.navigateToProject(projectId);
        });
        
        expect(result.current.activeView).toBe('project');
        expect(result.current.activeProjectId).toBe(projectId);
      });
    });
  });

  describe('navigateToSessions', () => {
    it('should set view to sessions and clear project ID', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Start with project state
      act(() => {
        result.current.navigateToProject(777);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(777);
      
      // Navigate to sessions
      act(() => {
        result.current.navigateToSessions();
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
    });

    it('should clear project ID even when already on sessions view', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Set up state with sessions view but with project ID
      act(() => {
        result.current.setActiveView('sessions');
        result.current.setActiveProjectId(333);
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBe(333);
      
      // Navigate to sessions (should clear project ID)
      act(() => {
        result.current.navigateToSessions();
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
    });

    it('should handle multiple sessions navigations', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Navigate to different projects first
      [1, 2, 3].forEach(projectId => {
        act(() => {
          result.current.navigateToProject(projectId);
        });
        
        expect(result.current.activeProjectId).toBe(projectId);
        
        act(() => {
          result.current.navigateToSessions();
        });
        
        expect(result.current.activeView).toBe('sessions');
        expect(result.current.activeProjectId).toBeNull();
      });
    });
  });

  describe('Navigation Workflows', () => {
    it('should handle typical project selection workflow', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // 1. Start on sessions
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
      
      // 2. Navigate to project
      act(() => {
        result.current.navigateToProject(1);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(1);
      
      // 3. Switch between projects
      act(() => {
        result.current.navigateToProject(2);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(2);
      
      // 4. Go back to sessions
      act(() => {
        result.current.navigateToSessions();
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
    });

    it('should handle manual view and project changes', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Manual changes (not using navigate methods)
      act(() => {
        result.current.setActiveView('project');
      });
      
      act(() => {
        result.current.setActiveProjectId(10);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(10);
      
      // Use navigate methods
      act(() => {
        result.current.navigateToSessions();
      });
      
      expect(result.current.activeView).toBe('sessions');
      expect(result.current.activeProjectId).toBeNull();
      
      act(() => {
        result.current.navigateToProject(20);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(20);
    });

    it('should handle edge cases with zero and negative project IDs', () => {
      const { result } = renderHook(() => useNavigationStore());
      
      // Project ID 0
      act(() => {
        result.current.navigateToProject(0);
      });
      
      expect(result.current.activeView).toBe('project');
      expect(result.current.activeProjectId).toBe(0);
      
      // Manually set negative ID (though unlikely in real usage)
      act(() => {
        result.current.setActiveProjectId(-1);
      });
      
      expect(result.current.activeProjectId).toBe(-1);
      
      // Navigate to sessions should clear it
      act(() => {
        result.current.navigateToSessions();
      });
      
      expect(result.current.activeProjectId).toBeNull();
    });
  });

  describe('Store State Persistence', () => {
    it('should maintain state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useNavigationStore());
      const { result: result2 } = renderHook(() => useNavigationStore());
      
      // Both hooks should see the same initial state
      expect(result1.current.activeView).toBe('sessions');
      expect(result2.current.activeView).toBe('sessions');
      expect(result1.current.activeProjectId).toBeNull();
      expect(result2.current.activeProjectId).toBeNull();
      
      // Change state in first hook
      act(() => {
        result1.current.navigateToProject(100);
      });
      
      // Both hooks should see the change
      expect(result1.current.activeView).toBe('project');
      expect(result2.current.activeView).toBe('project');
      expect(result1.current.activeProjectId).toBe(100);
      expect(result2.current.activeProjectId).toBe(100);
      
      // Change state in second hook
      act(() => {
        result2.current.navigateToSessions();
      });
      
      // Both hooks should see the change
      expect(result1.current.activeView).toBe('sessions');
      expect(result2.current.activeView).toBe('sessions');
      expect(result1.current.activeProjectId).toBeNull();
      expect(result2.current.activeProjectId).toBeNull();
    });
  });
});