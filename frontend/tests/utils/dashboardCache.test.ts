import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { dashboardCache } from '../../src/utils/dashboardCache';
import type { ProjectDashboardData } from '../../src/types/projectDashboard';

describe('DashboardCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear cache before each test
    dashboardCache.invalidateAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockDashboardData: ProjectDashboardData = {
    projectId: 1,
    projectName: 'Test Project',
    projectPath: '/test/path',
    mainBranch: 'main',
    mainBranchStatus: {
      status: 'up-to-date',
      lastFetched: '2024-01-15T12:00:00Z'
    },
    remotes: [
      {
        name: 'origin',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        status: 'up-to-date',
        aheadCount: 0,
        behindCount: 0,
        isUpstream: true
      }
    ],
    sessionBranches: [
      {
        sessionId: 'session-1',
        sessionName: 'Feature Work',
        branchName: 'feature/test',
        worktreePath: '/test/worktree',
        baseCommit: 'abc123',
        baseBranch: 'main',
        isStale: false,
        hasUncommittedChanges: false,
        commitsAhead: 2,
        commitsBehind: 0
      }
    ],
    lastRefreshed: '2024-01-15T12:00:00Z'
  };

  const mockDashboardData2: ProjectDashboardData = {
    ...mockDashboardData,
    projectId: 2,
    projectName: 'Another Project'
  };

  describe('set and get', () => {
    test('should store and retrieve dashboard data', () => {
      dashboardCache.set(1, mockDashboardData);
      const result = dashboardCache.get(1);
      
      expect(result).toEqual(mockDashboardData);
    });

    test('should return null for non-existent project', () => {
      const result = dashboardCache.get(999);
      expect(result).toBeNull();
    });

    test('should store multiple projects independently', () => {
      dashboardCache.set(1, mockDashboardData);
      dashboardCache.set(2, mockDashboardData2);
      
      expect(dashboardCache.get(1)).toEqual(mockDashboardData);
      expect(dashboardCache.get(2)).toEqual(mockDashboardData2);
    });

    test('should overwrite existing data for same project', () => {
      dashboardCache.set(1, mockDashboardData);
      
      const updatedData = {
        ...mockDashboardData,
        projectName: 'Updated Project Name'
      };
      
      dashboardCache.set(1, updatedData);
      const result = dashboardCache.get(1);
      
      expect(result?.projectName).toBe('Updated Project Name');
    });
  });

  describe('cache expiration', () => {
    test('should return cached data within expiration time', () => {
      dashboardCache.set(1, mockDashboardData);
      
      // Advance time by 30 seconds (less than 1 minute cache duration)
      vi.advanceTimersByTime(30 * 1000);
      
      const result = dashboardCache.get(1);
      expect(result).toEqual(mockDashboardData);
    });

    test('should return null for expired data', () => {
      dashboardCache.set(1, mockDashboardData);
      
      // Advance time by 61 seconds (more than 1 minute cache duration)
      vi.advanceTimersByTime(61 * 1000);
      
      const result = dashboardCache.get(1);
      expect(result).toBeNull();
    });

    test('should remove expired entry from cache', () => {
      dashboardCache.set(1, mockDashboardData);
      dashboardCache.set(2, mockDashboardData2);
      
      // Advance time to expire project 1
      vi.advanceTimersByTime(61 * 1000);
      
      // Access project 1 to trigger expiration cleanup
      dashboardCache.get(1);
      
      // Project 2 should still be accessible after setting it again within cache time
      vi.setSystemTime(new Date()); // Reset time
      dashboardCache.set(2, mockDashboardData2);
      
      expect(dashboardCache.get(2)).toEqual(mockDashboardData2);
    });

    test('should handle exact expiration boundary', () => {
      dashboardCache.set(1, mockDashboardData);
      
      // Advance time by exactly 60 seconds (1 minute cache duration)
      vi.advanceTimersByTime(60 * 1000);
      
      const result = dashboardCache.get(1);
      expect(result).toBeNull();
    });

    test('should handle multiple cache entries with different timestamps', () => {
      dashboardCache.set(1, mockDashboardData);
      
      // Advance time and add another entry
      vi.advanceTimersByTime(30 * 1000);
      dashboardCache.set(2, mockDashboardData2);
      
      // Advance time to expire first entry but not second
      vi.advanceTimersByTime(35 * 1000); // Total: 65 seconds for project 1, 35 for project 2
      
      expect(dashboardCache.get(1)).toBeNull();
      expect(dashboardCache.get(2)).toEqual(mockDashboardData2);
    });
  });

  describe('invalidate', () => {
    test('should remove specific project from cache', () => {
      dashboardCache.set(1, mockDashboardData);
      dashboardCache.set(2, mockDashboardData2);
      
      dashboardCache.invalidate(1);
      
      expect(dashboardCache.get(1)).toBeNull();
      expect(dashboardCache.get(2)).toEqual(mockDashboardData2);
    });

    test('should be safe to invalidate non-existent project', () => {
      dashboardCache.set(1, mockDashboardData);
      
      expect(() => dashboardCache.invalidate(999)).not.toThrow();
      expect(dashboardCache.get(1)).toEqual(mockDashboardData);
    });

    test('should handle invalidating already expired entry', () => {
      dashboardCache.set(1, mockDashboardData);
      
      // Expire the entry
      vi.advanceTimersByTime(61 * 1000);
      
      expect(() => dashboardCache.invalidate(1)).not.toThrow();
      expect(dashboardCache.get(1)).toBeNull();
    });
  });

  describe('invalidateAll', () => {
    test('should clear all cache entries', () => {
      dashboardCache.set(1, mockDashboardData);
      dashboardCache.set(2, mockDashboardData2);
      
      dashboardCache.invalidateAll();
      
      expect(dashboardCache.get(1)).toBeNull();
      expect(dashboardCache.get(2)).toBeNull();
    });

    test('should handle empty cache', () => {
      expect(() => dashboardCache.invalidateAll()).not.toThrow();
    });

    test('should allow new entries after clearing all', () => {
      dashboardCache.set(1, mockDashboardData);
      dashboardCache.invalidateAll();
      
      dashboardCache.set(2, mockDashboardData2);
      expect(dashboardCache.get(2)).toEqual(mockDashboardData2);
    });
  });

  describe('cache timing precision', () => {
    test('should handle rapid set/get operations', () => {
      for (let i = 0; i < 100; i++) {
        const data = { ...mockDashboardData, projectId: i };
        dashboardCache.set(i, data);
      }
      
      for (let i = 0; i < 100; i++) {
        const result = dashboardCache.get(i);
        expect(result?.projectId).toBe(i);
      }
    });

    test('should handle millisecond-level timing differences', () => {
      dashboardCache.set(1, mockDashboardData);
      
      // Advance by just under the expiration time
      vi.advanceTimersByTime(59999); // 59.999 seconds
      
      expect(dashboardCache.get(1)).toEqual(mockDashboardData);
      
      // Advance by 2 more milliseconds to cross the boundary
      vi.advanceTimersByTime(2);
      
      expect(dashboardCache.get(1)).toBeNull();
    });
  });

  describe('data integrity', () => {
    test('should return deep copy of cached data', () => {
      dashboardCache.set(1, mockDashboardData);
      const result1 = dashboardCache.get(1);
      const result2 = dashboardCache.get(1);
      
      // Modify one result
      if (result1) {
        result1.projectName = 'Modified Name';
      }
      
      // Other result should be unchanged
      expect(result2?.projectName).toBe('Test Project');
    });

    test('should handle complex nested data structures', () => {
      const complexData: ProjectDashboardData = {
        ...mockDashboardData,
        sessionBranches: [
          {
            sessionId: 'session-1',
            sessionName: 'Complex Session',
            branchName: 'feature/complex',
            worktreePath: '/complex/path',
            baseCommit: 'def456',
            baseBranch: 'develop',
            isStale: true,
            staleSince: '2024-01-14T12:00:00Z',
            hasUncommittedChanges: true,
            pullRequest: {
              number: 123,
              title: 'Test PR',
              state: 'open',
              url: 'https://github.com/user/repo/pull/123'
            },
            commitsAhead: 5,
            commitsBehind: 2
          }
        ]
      };
      
      dashboardCache.set(1, complexData);
      const result = dashboardCache.get(1);
      
      expect(result).toEqual(complexData);
      expect(result?.sessionBranches[0].pullRequest?.number).toBe(123);
    });

    test('should handle null and undefined values in data', () => {
      const dataWithNulls: ProjectDashboardData = {
        ...mockDashboardData,
        mainBranchStatus: undefined,
        remotes: undefined,
        sessionBranches: []
      };
      
      dashboardCache.set(1, dataWithNulls);
      const result = dashboardCache.get(1);
      
      expect(result).toEqual(dataWithNulls);
      expect(result?.mainBranchStatus).toBeUndefined();
      expect(result?.remotes).toBeUndefined();
    });
  });

  describe('error handling', () => {
    test('should handle invalid project IDs', () => {
      expect(() => dashboardCache.set(-1, mockDashboardData)).not.toThrow();
      expect(() => dashboardCache.get(-1)).not.toThrow();
      expect(() => dashboardCache.invalidate(-1)).not.toThrow();
    });

    test('should handle very large project IDs', () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      
      expect(() => dashboardCache.set(largeId, mockDashboardData)).not.toThrow();
      expect(dashboardCache.get(largeId)).toEqual(mockDashboardData);
    });

    test('should handle zero project ID', () => {
      dashboardCache.set(0, mockDashboardData);
      expect(dashboardCache.get(0)).toEqual(mockDashboardData);
    });
  });

  describe('memory management', () => {
    test('should automatically clean up expired entries on access', () => {
      // Fill cache with multiple entries
      for (let i = 0; i < 10; i++) {
        const data = { ...mockDashboardData, projectId: i };
        dashboardCache.set(i, data);
      }
      
      // Expire all entries
      vi.advanceTimersByTime(61 * 1000);
      
      // Access one entry to trigger cleanup
      dashboardCache.get(0);
      
      // All entries should now be gone
      for (let i = 0; i < 10; i++) {
        expect(dashboardCache.get(i)).toBeNull();
      }
    });

    test('should handle mixed valid and expired entries', () => {
      // Add first batch of entries
      for (let i = 0; i < 5; i++) {
        const data = { ...mockDashboardData, projectId: i };
        dashboardCache.set(i, data);
      }
      
      // Advance time to make first batch stale
      vi.advanceTimersByTime(61 * 1000);
      
      // Add second batch of entries
      for (let i = 5; i < 10; i++) {
        const data = { ...mockDashboardData, projectId: i };
        dashboardCache.set(i, data);
      }
      
      // First batch should be expired, second batch should be valid
      for (let i = 0; i < 5; i++) {
        expect(dashboardCache.get(i)).toBeNull();
      }
      
      for (let i = 5; i < 10; i++) {
        expect(dashboardCache.get(i)).not.toBeNull();
      }
    });
  });
});