import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitHubStore } from '../../src/stores/githubStore';
import { API } from '../../src/utils/api';
import type { GitHubPR, GitHubIssue, GitHubCIStatus } from '../../../shared/types';

// Mock API
vi.mock('../../src/utils/api', () => ({
  API: {
    github: {
      getPRs: vi.fn(),
      getIssues: vi.fn(),
      getCIStatus: vi.fn(),
      getCILogs: vi.fn(),
      createFixSession: vi.fn(),
      createPR: vi.fn()
    }
  }
}));

// Mock console methods to reduce noise
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Helper functions to create mock data
const createMockPR = (overrides: Partial<GitHubPR> = {}): GitHubPR => ({
  id: 'pr-123',
  number: 123,
  title: 'Fix authentication bug',
  state: 'open',
  author: 'developer1',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  url: 'https://github.com/test/repo/pull/123',
  labels: ['bug'],
  assignees: [],
  isDraft: false,
  mergeable: true,
  headBranch: 'fix/auth-bug',
  baseBranch: 'main',
  ciStatus: 'failure',
  body: 'Fixes the authentication issue reported in #456',
  reviewDecision: 'REVIEW_REQUIRED',
  comments: 3,
  ...overrides,
});

const createMockIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => ({
  id: 'issue-456',
  number: 456,
  title: 'Add dark mode support',
  state: 'open',
  author: 'designer1',
  createdAt: '2024-01-14T15:20:00Z',
  updatedAt: '2024-01-14T15:20:00Z',
  url: 'https://github.com/test/repo/issues/456',
  labels: ['enhancement', 'ui'],
  assignees: ['developer2'],
  isPullRequest: false,
  comments: 5,
  milestone: 'v2.0',
  ...overrides,
});

const createMockCIStatus = (overrides: Partial<GitHubCIStatus> = {}): GitHubCIStatus => ({
  status: 'failure',
  conclusion: 'failure',
  logs: 'Error: Tests failed\n  at src/auth.test.js:42:10',
  totalCount: 3,
  successCount: 1,
  failureCount: 2,
  checks: [
    {
      name: 'CI / build',
      status: 'completed',
      conclusion: 'failure',
      url: 'https://github.com/test/repo/actions/runs/123',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:15:00Z',
      output: {
        title: 'Build Failed',
        summary: 'Tests failed with 2 errors',
        text: 'Detailed error logs...'
      }
    },
    {
      name: 'CI / test',
      status: 'completed',
      conclusion: 'success',
      url: 'https://github.com/test/repo/actions/runs/124'
    },
    {
      name: 'CI / lint',
      status: 'completed',
      conclusion: 'failure',
      url: 'https://github.com/test/repo/actions/runs/125'
    }
  ],
  checkRuns: [
    {
      name: 'CI / build',
      status: 'completed',
      conclusion: 'failure',
      url: 'https://github.com/test/repo/actions/runs/123'
    }
  ],
  ...overrides,
});

describe('GitHub Store', () => {
  beforeEach(() => {
    // Reset store state
    useGitHubStore.getState().clearCache();
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    
    // Reset Date.now to a fixed value for consistent cache testing
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      expect(result.current.prs).toEqual([]);
      expect(result.current.issues).toEqual([]);
      expect(result.current.ciStatuses).toEqual({});
      expect(result.current.isLoadingPRs).toBe(false);
      expect(result.current.isLoadingIssues).toBe(false);
      expect(result.current.isLoadingCIStatus).toEqual(new Set());
      expect(result.current.isCreatingSession).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetchTime).toEqual({});
      expect(result.current.ciStatusFetchTime).toEqual({});
      expect(result.current.cacheTimeout).toBe(5 * 60 * 1000);
      expect(result.current.ciCacheTimeout).toBe(2 * 60 * 1000);
    });
  });

  describe('fetchPRs', () => {
    it('should fetch PRs successfully', async () => {
      const mockPRs = [createMockPR(), createMockPR({ id: 'pr-124', number: 124 })];
      const mockApiResponse = { success: true, data: mockPRs };
      vi.mocked(API.github.getPRs).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      expect(result.current.prs).toEqual([]);
      expect(result.current.isLoadingPRs).toBe(false);

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(result.current.prs).toEqual(mockPRs);
      expect(result.current.isLoadingPRs).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetchTime[1]).toBeDefined();
      expect(API.github.getPRs).toHaveBeenCalledWith(1);
      expect(API.github.getPRs).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch PRs error from API', async () => {
      const mockApiResponse = { success: false, error: 'GitHub CLI not found' };
      vi.mocked(API.github.getPRs).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(result.current.prs).toEqual([]);
      expect(result.current.error).toBe('GitHub CLI not found');
      expect(result.current.isLoadingPRs).toBe(false);
    });

    it('should handle fetch PRs network error', async () => {
      const networkError = new Error('Network timeout');
      vi.mocked(API.github.getPRs).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(result.current.prs).toEqual([]);
      expect(result.current.error).toBe('Network timeout');
      expect(result.current.isLoadingPRs).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('Error fetching PRs:', networkError);
    });

    it('should use cache when valid and data exists', async () => {
      const mockPRs = [createMockPR()];
      const mockApiResponse = { success: true, data: mockPRs };
      vi.mocked(API.github.getPRs).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      // First fetch
      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(API.github.getPRs).toHaveBeenCalledTimes(1);

      // Second fetch should use cache
      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(API.github.getPRs).toHaveBeenCalledTimes(1); // Still only called once
      expect(result.current.prs).toEqual(mockPRs);
    });

    it('should skip cache when no data exists even if cache is valid', async () => {
      const { result } = renderHook(() => useGitHubStore());
      
      // Set valid cache time but no data
      act(() => {
        useGitHubStore.setState({
          lastFetchTime: { 1: Date.now() },
          prs: []
        });
      });

      const mockPRs = [createMockPR()];
      const mockApiResponse = { success: true, data: mockPRs };
      vi.mocked(API.github.getPRs).mockResolvedValue(mockApiResponse);

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(API.github.getPRs).toHaveBeenCalledTimes(1);
      expect(result.current.prs).toEqual(mockPRs);
    });

    it('should force refresh when requested', async () => {
      const mockPRs = [createMockPR()];
      const mockApiResponse = { success: true, data: mockPRs };
      vi.mocked(API.github.getPRs).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      // First fetch
      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(API.github.getPRs).toHaveBeenCalledTimes(1);

      // Force refresh
      await act(async () => {
        await result.current.fetchPRs(1, true);
      });

      expect(API.github.getPRs).toHaveBeenCalledTimes(2);
    });

    it('should handle API response without data field', async () => {
      const mockApiResponse = { success: true }; // No data field
      vi.mocked(API.github.getPRs).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(result.current.error).toBe('Failed to fetch pull requests');
    });
  });

  describe('fetchIssues', () => {
    it('should fetch issues successfully', async () => {
      const mockIssues = [createMockIssue(), createMockIssue({ id: 'issue-789', number: 789 })];
      const mockApiResponse = { success: true, data: mockIssues };
      vi.mocked(API.github.getIssues).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchIssues(1);
      });

      expect(result.current.issues).toEqual(mockIssues);
      expect(result.current.isLoadingIssues).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetchTime[1]).toBeDefined();
      expect(API.github.getIssues).toHaveBeenCalledWith(1);
    });

    it('should handle fetch issues error', async () => {
      const mockApiResponse = { success: false, error: 'Authentication failed' };
      vi.mocked(API.github.getIssues).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchIssues(1);
      });

      expect(result.current.issues).toEqual([]);
      expect(result.current.error).toBe('Authentication failed');
      expect(result.current.isLoadingIssues).toBe(false);
    });

    it('should use cache for issues when valid', async () => {
      const mockIssues = [createMockIssue()];
      const mockApiResponse = { success: true, data: mockIssues };
      vi.mocked(API.github.getIssues).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      // First fetch
      await act(async () => {
        await result.current.fetchIssues(1);
      });

      expect(API.github.getIssues).toHaveBeenCalledTimes(1);

      // Second fetch should use cache
      await act(async () => {
        await result.current.fetchIssues(1);
      });

      expect(API.github.getIssues).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchCIStatus', () => {
    it('should fetch CI status successfully', async () => {
      const mockCIStatus = createMockCIStatus();
      const mockApiResponse = { success: true, data: mockCIStatus };
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockApiResponse);

      // First set up some PRs
      const mockPRs = [createMockPR({ number: 123 })];
      const mockPRResponse = { success: true, data: mockPRs };
      vi.mocked(API.github.getPRs).mockResolvedValue(mockPRResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      await act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      expect(result.current.ciStatuses[123]).toEqual(mockCIStatus);
      expect(result.current.prs[0].ciStatus).toBe('failure');
      expect(result.current.ciStatusFetchTime[123]).toBeDefined();
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 123);
    });

    it('should handle duplicate CI status requests', async () => {
      const mockCIStatus = createMockCIStatus();
      const mockApiResponse = { success: true, data: mockCIStatus };
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      // Start two concurrent requests
      const promise1 = act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });
      
      const promise2 = act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      await Promise.all([promise1, promise2]);

      // Should only make one API call
      expect(API.github.getCIStatus).toHaveBeenCalledTimes(1);
    });

    it('should use cache for CI status when valid', async () => {
      const mockCIStatus = createMockCIStatus();
      const mockApiResponse = { success: true, data: mockCIStatus };
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      // First fetch
      await act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      expect(API.github.getCIStatus).toHaveBeenCalledTimes(1);

      // Second fetch should use cache
      await act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      expect(API.github.getCIStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle CI status fetch failure gracefully', async () => {
      const networkError = new Error('Network error');
      vi.mocked(API.github.getCIStatus).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      // Should not set error state for CI status failures (they're warnings)
      expect(result.current.error).toBeNull();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to get CI status for PR #123:',
        networkError
      );
    });

    it('should clean up loading state after CI status fetch', async () => {
      const mockCIStatus = createMockCIStatus();
      const mockApiResponse = { success: true, data: mockCIStatus };
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      // Before fetch - not loading
      expect(result.current.isLoadingCIStatus.has(123)).toBe(false);

      const fetchPromise = act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      // During fetch - should be loading
      expect(result.current.isLoadingCIStatus.has(123)).toBe(true);

      await fetchPromise;

      // After fetch - not loading
      expect(result.current.isLoadingCIStatus.has(123)).toBe(false);
    });
  });

  describe('fetchAllData', () => {
    it('should fetch all data and CI statuses in parallel', async () => {
      const mockPRs = [createMockPR({ number: 123 }), createMockPR({ number: 124 })];
      const mockIssues = [createMockIssue()];
      const mockCIStatus = createMockCIStatus();

      const mockPRResponse = { success: true, data: mockPRs };
      const mockIssueResponse = { success: true, data: mockIssues };
      const mockCIResponse = { success: true, data: mockCIStatus };

      vi.mocked(API.github.getPRs).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getIssues).mockResolvedValue(mockIssueResponse);
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockCIResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchAllData(1);
      });

      expect(result.current.prs).toEqual(mockPRs);
      expect(result.current.issues).toEqual(mockIssues);
      expect(API.github.getPRs).toHaveBeenCalledWith(1, false);
      expect(API.github.getIssues).toHaveBeenCalledWith(1, false);
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 123, false);
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 124, false);
    });

    it('should handle partial failures gracefully', async () => {
      const mockPRs = [createMockPR({ number: 123 })];
      const mockPRResponse = { success: true, data: mockPRs };
      const mockIssueResponse = { success: false, error: 'Issues fetch failed' };
      const mockCIResponse = { success: true, data: createMockCIStatus() };

      vi.mocked(API.github.getPRs).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getIssues).mockResolvedValue(mockIssueResponse);
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockCIResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchAllData(1);
      });

      // PRs should succeed
      expect(result.current.prs).toEqual(mockPRs);
      // Issues should fail but not prevent CI status fetch
      expect(result.current.issues).toEqual([]);
      expect(result.current.error).toBe('Issues fetch failed');
      // CI status should still be fetched for PRs
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 123, false);
    });
  });

  describe('createFixSession', () => {
    it('should create fix session for PR with failed CI', async () => {
      const mockCILogsResponse = { success: true, data: 'CI failed: test error' };
      const mockSessionResponse = { success: true, data: { sessionId: 'session-123' } };

      vi.mocked(API.github.getCILogs).mockResolvedValue(mockCILogsResponse);
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      // Set up CI status for the PR
      act(() => {
        useGitHubStore.setState({
          ciStatuses: { 123: createMockCIStatus({ status: 'failure' }) }
        });
      });

      const prWithType = { ...createMockPR({ number: 123 }), type: 'pr' as const };

      let sessionResult: any;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'session-123' });
      expect(API.github.getCILogs).toHaveBeenCalledWith(1, 123);
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        type: 'pr',
        prNumber: 123,
        issueNumber: undefined,
        ciLogs: 'CI failed: test error',
        title: prWithType.title,
        body: prWithType.body
      });
      expect(result.current.isCreatingSession).toBeNull();
    });

    it('should create fix session for PR without CI logs', async () => {
      const mockSessionResponse = { success: true, data: { sessionId: 'session-456' } };
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      // Set up CI status as success (no logs needed)
      act(() => {
        useGitHubStore.setState({
          ciStatuses: { 123: createMockCIStatus({ status: 'success' }) }
        });
      });

      const prWithType = { ...createMockPR({ number: 123 }), type: 'pr' as const };

      let sessionResult: any;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'session-456' });
      expect(API.github.getCILogs).not.toHaveBeenCalled();
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        type: 'pr',
        prNumber: 123,
        issueNumber: undefined,
        ciLogs: undefined,
        title: prWithType.title,
        body: prWithType.body
      });
    });

    it('should create fix session for issue', async () => {
      const mockSessionResponse = { success: true, data: { sessionId: 'session-789' } };
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      const issueWithType = { ...createMockIssue({ number: 456 }), type: 'issue' as const };

      let sessionResult: any;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, issueWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'session-789' });
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        type: 'issue',
        prNumber: 0, // Default for issues
        issueNumber: 456,
        ciLogs: undefined,
        title: issueWithType.title,
        body: undefined // Issues don't have body in the same way
      });
    });

    it('should handle session creation failure', async () => {
      const mockSessionResponse = { success: false, error: 'Session creation failed' };
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      const prWithType = { ...createMockPR(), type: 'pr' as const };

      let sessionResult: any;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: false, error: 'Session creation failed' });
      expect(result.current.error).toBe('Session creation failed');
      expect(result.current.isCreatingSession).toBeNull();
    });

    it('should handle CI logs fetch failure gracefully', async () => {
      const mockCILogsResponse = { success: false, error: 'Logs not found' };
      const mockSessionResponse = { success: true, data: { sessionId: 'session-123' } };

      vi.mocked(API.github.getCILogs).mockResolvedValue(mockCILogsResponse);
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      act(() => {
        useGitHubStore.setState({
          ciStatuses: { 123: createMockCIStatus({ status: 'failure' }) }
        });
      });

      const prWithType = { ...createMockPR({ number: 123 }), type: 'pr' as const };

      let sessionResult: any;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'session-123' });
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        type: 'pr',
        prNumber: 123,
        issueNumber: undefined,
        ciLogs: undefined, // Should be undefined when logs fetch fails
        title: prWithType.title,
        body: prWithType.body
      });
    });

    it('should set and clear isCreatingSession loading state', async () => {
      const mockSessionResponse = { success: true, data: { sessionId: 'session-123' } };
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      const prWithType = { ...createMockPR(), type: 'pr' as const };

      expect(result.current.isCreatingSession).toBeNull();

      const createPromise = act(async () => {
        await result.current.createFixSession(1, prWithType);
      });

      // Should be loading during creation
      expect(result.current.isCreatingSession).toBe(prWithType.id);

      await createPromise;

      // Should clear loading state after completion
      expect(result.current.isCreatingSession).toBeNull();
    });
  });

  describe('createPR', () => {
    it('should create PR successfully and refresh PR list', async () => {
      const mockPRResponse = { success: true, data: 'https://github.com/test/repo/pull/789' };
      const mockRefreshResponse = { success: true, data: [createMockPR({ number: 789 })] };

      vi.mocked(API.github.createPR).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getPRs).mockResolvedValue(mockRefreshResponse);

      const { result } = renderHook(() => useGitHubStore());

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createPR(1, 'New PR Title', 'PR description');
      });

      expect(createResult).toEqual({ success: true });
      expect(API.github.createPR).toHaveBeenCalledWith(1, 'New PR Title', 'PR description');
      expect(API.github.getPRs).toHaveBeenCalledWith(1, true); // Force refresh
    });

    it('should create PR without body', async () => {
      const mockPRResponse = { success: true, data: 'https://github.com/test/repo/pull/789' };
      const mockRefreshResponse = { success: true, data: [createMockPR()] };

      vi.mocked(API.github.createPR).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getPRs).mockResolvedValue(mockRefreshResponse);

      const { result } = renderHook(() => useGitHubStore());

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createPR(1, 'New PR Title');
      });

      expect(createResult).toEqual({ success: true });
      expect(API.github.createPR).toHaveBeenCalledWith(1, 'New PR Title', undefined);
    });

    it('should handle PR creation failure', async () => {
      const mockPRResponse = { success: false, error: 'PR creation failed' };
      vi.mocked(API.github.createPR).mockResolvedValue(mockPRResponse);

      const { result } = renderHook(() => useGitHubStore());

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createPR(1, 'New PR');
      });

      expect(createResult).toEqual({ success: false, error: 'PR creation failed' });
      expect(result.current.error).toBe('PR creation failed');
      expect(API.github.getPRs).not.toHaveBeenCalled(); // Should not refresh on failure
    });

    it('should handle network error during PR creation', async () => {
      const networkError = new Error('Network failed');
      vi.mocked(API.github.createPR).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGitHubStore());

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createPR(1, 'New PR');
      });

      expect(createResult).toEqual({ success: false, error: 'Network failed' });
      expect(result.current.error).toBe('Network failed');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      const mockPRs = [
        createMockPR({ id: 'pr-123', number: 123 }),
        createMockPR({ id: 'pr-124', number: 124 })
      ];
      const mockIssues = [createMockIssue({ id: 'issue-456', number: 456 })];
      const mockCIStatus = createMockCIStatus();

      const mockPRResponse = { success: true, data: mockPRs };
      const mockIssueResponse = { success: true, data: mockIssues };

      vi.mocked(API.github.getPRs).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getIssues).mockResolvedValue(mockIssueResponse);

      const { result } = renderHook(() => useGitHubStore());
      
      await act(async () => {
        await result.current.fetchPRs(1);
        await result.current.fetchIssues(1);
      });

      // Set up CI status
      act(() => {
        useGitHubStore.setState({
          ciStatuses: { 123: mockCIStatus }
        });
      });
    });

    describe('getAllData', () => {
      it('should return all data with type annotations', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const allData = result.current.getAllData();
        
        expect(allData).toHaveLength(3); // 2 PRs + 1 Issue
        expect(allData[0]).toMatchObject({ 
          id: 'pr-123',
          type: 'pr',
          number: 123
        });
        expect(allData[1]).toMatchObject({ 
          id: 'pr-124',
          type: 'pr',
          number: 124
        });
        expect(allData[2]).toMatchObject({ 
          id: 'issue-456',
          type: 'issue',
          number: 456
        });
      });

      it('should return empty array when no data', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        act(() => {
          result.current.clearCache();
        });
        
        const allData = result.current.getAllData();
        expect(allData).toEqual([]);
      });
    });

    describe('getPRById', () => {
      it('should return PR by ID', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const pr = result.current.getPRById('pr-123');
        
        expect(pr).toMatchObject({
          id: 'pr-123',
          number: 123
        });
      });

      it('should return undefined for non-existent PR', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const pr = result.current.getPRById('non-existent');
        
        expect(pr).toBeUndefined();
      });
    });

    describe('getIssueById', () => {
      it('should return issue by ID', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const issue = result.current.getIssueById('issue-456');
        
        expect(issue).toMatchObject({
          id: 'issue-456',
          number: 456
        });
      });

      it('should return undefined for non-existent issue', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const issue = result.current.getIssueById('non-existent');
        
        expect(issue).toBeUndefined();
      });
    });

    describe('getCIStatus', () => {
      it('should return CI status by PR number', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const ciStatus = result.current.getCIStatus(123);
        
        expect(ciStatus).toMatchObject({
          status: 'failure',
          totalCount: 3
        });
      });

      it('should return undefined for non-existent CI status', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const ciStatus = result.current.getCIStatus(999);
        
        expect(ciStatus).toBeUndefined();
      });
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('isCacheValid', () => {
      it('should return false for never-fetched project', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        expect(result.current.isCacheValid(1)).toBe(false);
      });

      it('should return true for recently fetched project', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        // Set recent fetch time
        act(() => {
          useGitHubStore.setState({
            lastFetchTime: { 1: Date.now() }
          });
        });
        
        expect(result.current.isCacheValid(1)).toBe(true);
      });

      it('should return false for expired cache', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        // Set old fetch time (6 minutes ago, cache timeout is 5 minutes)
        act(() => {
          useGitHubStore.setState({
            lastFetchTime: { 1: Date.now() - 6 * 60 * 1000 }
          });
        });
        
        expect(result.current.isCacheValid(1)).toBe(false);
      });

      it('should return true at cache boundary', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        // Set fetch time at exactly cache timeout (5 minutes ago)
        act(() => {
          useGitHubStore.setState({
            lastFetchTime: { 1: Date.now() - 5 * 60 * 1000 + 1000 } // 4 minutes ago
          });
        });
        
        expect(result.current.isCacheValid(1)).toBe(true);
      });
    });

    describe('isCIStatusCacheValid', () => {
      it('should return false for never-fetched CI status', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        expect(result.current.isCIStatusCacheValid(123)).toBe(false);
      });

      it('should return true for recently fetched CI status', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        act(() => {
          useGitHubStore.setState({
            ciStatusFetchTime: { 123: Date.now() }
          });
        });
        
        expect(result.current.isCIStatusCacheValid(123)).toBe(true);
      });

      it('should return false for expired CI status cache', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        // Set old fetch time (3 minutes ago, CI cache timeout is 2 minutes)
        act(() => {
          useGitHubStore.setState({
            ciStatusFetchTime: { 123: Date.now() - 3 * 60 * 1000 }
          });
        });
        
        expect(result.current.isCIStatusCacheValid(123)).toBe(false);
      });
    });

    describe('clearCache', () => {
      it('should clear all cache and data', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        // Set some data
        act(() => {
          useGitHubStore.setState({
            prs: [createMockPR()],
            issues: [createMockIssue()],
            ciStatuses: { 123: createMockCIStatus() },
            lastFetchTime: { 1: Date.now() },
            ciStatusFetchTime: { 123: Date.now() },
            error: 'Some error'
          });
        });
        
        expect(result.current.prs).toHaveLength(1);
        expect(result.current.issues).toHaveLength(1);
        expect(result.current.error).toBe('Some error');
        
        act(() => {
          result.current.clearCache();
        });
        
        expect(result.current.prs).toEqual([]);
        expect(result.current.issues).toEqual([]);
        expect(result.current.ciStatuses).toEqual({});
        expect(result.current.lastFetchTime).toEqual({});
        expect(result.current.ciStatusFetchTime).toEqual({});
        expect(result.current.error).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear only error state', () => {
        const { result } = renderHook(() => useGitHubStore());
        
        const mockPRs = [createMockPR()];
        
        act(() => {
          useGitHubStore.setState({
            prs: mockPRs,
            error: 'Some error'
          });
        });
        
        expect(result.current.error).toBe('Some error');
        expect(result.current.prs).toEqual(mockPRs);
        
        act(() => {
          result.current.clearError();
        });
        
        expect(result.current.error).toBeNull();
        expect(result.current.prs).toEqual(mockPRs); // Should preserve data
      });
    });
  });

  describe('Complex Workflows', () => {
    it('should handle complete GitHub integration workflow', async () => {
      const { result } = renderHook(() => useGitHubStore());

      // 1. Fetch all data
      const mockPRs = [createMockPR({ number: 123, ciStatus: undefined })];
      const mockIssues = [createMockIssue()];
      const mockCIStatus = createMockCIStatus({ status: 'failure' });

      vi.mocked(API.github.getPRs).mockResolvedValue({ success: true, data: mockPRs });
      vi.mocked(API.github.getIssues).mockResolvedValue({ success: true, data: mockIssues });
      vi.mocked(API.github.getCIStatus).mockResolvedValue({ success: true, data: mockCIStatus });

      await act(async () => {
        await result.current.fetchAllData(1);
      });

      expect(result.current.prs).toHaveLength(1);
      expect(result.current.issues).toHaveLength(1);
      expect(result.current.prs[0].ciStatus).toBe('failure'); // Updated by CI status fetch

      // 2. Create fix session for failed PR
      const mockCILogs = 'CI failed: Tests failed\nError in auth.test.js';
      const mockSessionResponse = { success: true, data: { sessionId: 'fix-session-123' } };

      vi.mocked(API.github.getCILogs).mockResolvedValue({ success: true, data: mockCILogs });
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const prWithType = { ...mockPRs[0], type: 'pr' as const };

      let sessionResult: any;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'fix-session-123' });
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        type: 'pr',
        prNumber: 123,
        issueNumber: undefined,
        ciLogs: mockCILogs,
        title: mockPRs[0].title,
        body: mockPRs[0].body
      });

      // 3. Create new PR
      const mockNewPRResponse = { success: true, data: 'https://github.com/test/repo/pull/125' };
      const mockRefreshPRs = [...mockPRs, createMockPR({ number: 125 })];

      vi.mocked(API.github.createPR).mockResolvedValue(mockNewPRResponse);
      vi.mocked(API.github.getPRs).mockResolvedValue({ success: true, data: mockRefreshPRs });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createPR(1, 'Fix authentication bug', 'This PR fixes the auth issue');
      });

      expect(createResult).toEqual({ success: true });
      expect(result.current.prs).toHaveLength(2); // Should have refreshed with new PR

      // 4. Clear cache and start fresh
      act(() => {
        result.current.clearCache();
      });

      expect(result.current.prs).toEqual([]);
      expect(result.current.issues).toEqual([]);
      expect(result.current.ciStatuses).toEqual({});
    });

    it('should handle errors gracefully without breaking the workflow', async () => {
      const { result } = renderHook(() => useGitHubStore());

      // Start with successful PR fetch
      const mockPRs = [createMockPR({ number: 123 })];
      vi.mocked(API.github.getPRs).mockResolvedValue({ success: true, data: mockPRs });

      await act(async () => {
        await result.current.fetchPRs(1);
      });

      expect(result.current.prs).toEqual(mockPRs);
      expect(result.current.error).toBeNull();

      // Issues fetch fails
      vi.mocked(API.github.getIssues).mockResolvedValue({ success: false, error: 'Issues failed' });

      await act(async () => {
        await result.current.fetchIssues(1);
      });

      expect(result.current.issues).toEqual([]);
      expect(result.current.error).toBe('Issues failed');

      // Clear error and continue
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();

      // CI status fetch fails (should not set error)
      vi.mocked(API.github.getCIStatus).mockRejectedValue(new Error('CI fetch failed'));

      await act(async () => {
        await result.current.fetchCIStatus(1, 123);
      });

      expect(result.current.error).toBeNull(); // Should not set error for CI failures
      expect(result.current.ciStatuses[123]).toBeUndefined();

      // PRs should still be available
      expect(result.current.prs).toEqual(mockPRs);
    });
  });
});