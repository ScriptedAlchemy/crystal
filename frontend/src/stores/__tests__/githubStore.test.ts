import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitHubStore } from '../githubStore';
import { API } from '../../utils/api';
import type { GitHubPR, GitHubIssue, GitHubCIStatus } from '../../../../shared/types';

// Mock API
vi.mock('../../utils/api', () => ({
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

const mockPRs: GitHubPR[] = [
  {
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
    ciStatus: 'failure'
  },
  {
    id: 'pr-124',
    number: 124,
    title: 'Add new feature',
    state: 'open',
    author: 'developer2',
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z',
    url: 'https://github.com/test/repo/pull/124',
    labels: ['enhancement'],
    assignees: ['reviewer1'],
    isDraft: true,
    mergeable: true,
    headBranch: 'feature/new-feature',
    baseBranch: 'main',
    ciStatus: 'failure'
  }
];

const mockIssues: GitHubIssue[] = [
  {
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
    isPullRequest: false
  }
];

const mockCIStatus: GitHubCIStatus = {
  status: 'failure',
  checks: [
    {
      name: 'CI / build',
      status: 'completed',
      conclusion: 'failure',
      url: 'https://github.com/test/repo/actions/runs/123'
    }
  ],
  checkRuns: [
    {
      name: 'CI / build',
      status: 'completed',
      conclusion: 'failure',
      url: 'https://github.com/test/repo/actions/runs/123'
    }
  ]
};

describe('GitHub Store', () => {
  beforeEach(() => {
    // Reset store state
    useGitHubStore.getState().clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPRs', () => {
    it('should fetch PRs successfully', async () => {
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
      expect(API.github.getPRs).toHaveBeenCalledWith(1);
    });

    it('should handle fetch PRs error', async () => {
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

    it('should use cache when valid', async () => {
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

    it('should force refresh when requested', async () => {
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
  });

  describe('fetchIssues', () => {
    it('should fetch issues successfully', async () => {
      const mockApiResponse = { success: true, data: mockIssues };
      vi.mocked(API.github.getIssues).mockResolvedValue(mockApiResponse);

      const { result } = renderHook(() => useGitHubStore());

      await act(async () => {
        await result.current.fetchIssues(1);
      });

      expect(result.current.issues).toEqual(mockIssues);
      expect(result.current.isLoadingIssues).toBe(false);
      expect(result.current.error).toBeNull();
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
  });

  describe('fetchCIStatus', () => {
    it('should fetch CI status successfully', async () => {
      const mockApiResponse = { success: true, data: mockCIStatus };
      vi.mocked(API.github.getCIStatus).mockResolvedValue(mockApiResponse);

      // First set up some PRs
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
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 123);
    });

    it('should handle duplicate CI status requests', async () => {
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
  });

  describe('fetchAllData', () => {
    it('should fetch all data and CI statuses', async () => {
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
      expect(API.github.getPRs).toHaveBeenCalledWith(1);
      expect(API.github.getIssues).toHaveBeenCalledWith(1);
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 123);
      expect(API.github.getCIStatus).toHaveBeenCalledWith(1, 124);
    });
  });

  describe('createFixSession', () => {
    it('should create fix session for PR successfully', async () => {
      const mockCILogsResponse = { success: true, data: 'CI failed: test error' };
      const mockSessionResponse = { success: true, data: { sessionId: 'session-123' } };

      vi.mocked(API.github.getCILogs).mockResolvedValue(mockCILogsResponse);
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      const prWithType = { ...mockPRs[0], type: 'pr' as const };

      let sessionResult;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'session-123' });
      expect(API.github.getCILogs).toHaveBeenCalledWith(1, 123);
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        prNumber: 123,
        ciLogs: 'CI failed: test error',
        type: 'pr'
      });
    });

    it('should create fix session for issue successfully', async () => {
      const mockSessionResponse = { success: true, data: { sessionId: 'session-456' } };
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      const issueWithType = { ...mockIssues[0], type: 'issue' as const };

      let sessionResult;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, issueWithType);
      });

      expect(sessionResult).toEqual({ success: true, sessionId: 'session-456' });
      expect(API.github.createFixSession).toHaveBeenCalledWith({
        projectId: 1,
        prNumber: 456,
        ciLogs: undefined,
        type: 'issue'
      });
    });

    it('should handle session creation failure', async () => {
      const mockSessionResponse = { success: false, error: 'Session creation failed' };
      vi.mocked(API.github.createFixSession).mockResolvedValue(mockSessionResponse);

      const { result } = renderHook(() => useGitHubStore());

      const prWithType = { ...mockPRs[0], type: 'pr' as const };

      let sessionResult;
      await act(async () => {
        sessionResult = await result.current.createFixSession(1, prWithType);
      });

      expect(sessionResult).toEqual({ success: false, error: 'Session creation failed' });
      expect(result.current.error).toBe('Session creation failed');
    });
  });

  describe('createPR', () => {
    it('should create PR successfully', async () => {
      const mockPRResponse = { success: true, data: 'https://github.com/test/repo/pull/789' };
      const mockRefreshResponse = { success: true, data: [...mockPRs] };

      vi.mocked(API.github.createPR).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getPRs).mockResolvedValue(mockRefreshResponse);

      const { result } = renderHook(() => useGitHubStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPR(1, 'New PR', 'PR description');
      });

      expect(createResult).toEqual({ success: true });
      expect(API.github.createPR).toHaveBeenCalledWith(1, 'New PR', 'PR description');
      expect(API.github.getPRs).toHaveBeenCalledWith(1);
    });

    it('should handle PR creation failure', async () => {
      const mockPRResponse = { success: false, error: 'PR creation failed' };
      vi.mocked(API.github.createPR).mockResolvedValue(mockPRResponse);

      const { result } = renderHook(() => useGitHubStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createPR(1, 'New PR');
      });

      expect(createResult).toEqual({ success: false, error: 'PR creation failed' });
      expect(result.current.error).toBe('PR creation failed');
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      const mockPRResponse = { success: true, data: mockPRs };
      const mockIssueResponse = { success: true, data: mockIssues };

      vi.mocked(API.github.getPRs).mockResolvedValue(mockPRResponse);
      vi.mocked(API.github.getIssues).mockResolvedValue(mockIssueResponse);

      const { result } = renderHook(() => useGitHubStore());
      
      await act(async () => {
        await result.current.fetchPRs(1);
        await result.current.fetchIssues(1);
      });
    });

    it('should get all data with type annotations', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      const allData = result.current.getAllData();
      
      expect(allData).toHaveLength(3); // 2 PRs + 1 Issue
      expect(allData[0]).toMatchObject({ ...mockPRs[0], type: 'pr' });
      expect(allData[1]).toMatchObject({ ...mockPRs[1], type: 'pr' });
      expect(allData[2]).toMatchObject({ ...mockIssues[0], type: 'issue' });
    });

    it('should get PR by ID', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      const pr = result.current.getPRById('pr-123');
      
      expect(pr).toEqual(mockPRs[0]);
    });

    it('should get issue by ID', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      const issue = result.current.getIssueById('issue-456');
      
      expect(issue).toEqual(mockIssues[0]);
    });

    it('should return undefined for non-existent items', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      expect(result.current.getPRById('non-existent')).toBeUndefined();
      expect(result.current.getIssueById('non-existent')).toBeUndefined();
    });
  });

  describe('cache management', () => {
    it('should validate cache correctly', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      // Fresh cache should be invalid
      expect(result.current.isCacheValid(1)).toBe(false);
      
      // Set a recent timestamp
      act(() => {
        useGitHubStore.setState({
          lastFetchTime: { 1: Date.now() }
        });
      });
      
      expect(result.current.isCacheValid(1)).toBe(true);
      
      // Set an old timestamp
      act(() => {
        useGitHubStore.setState({
          lastFetchTime: { 1: Date.now() - 10 * 60 * 1000 } // 10 minutes ago
        });
      });
      
      expect(result.current.isCacheValid(1)).toBe(false);
    });

    it('should clear cache correctly', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      // Set some data
      act(() => {
        useGitHubStore.setState({
          prs: mockPRs,
          issues: mockIssues,
          ciStatuses: { 123: mockCIStatus },
          lastFetchTime: { 1: Date.now() },
          error: 'Some error'
        });
      });
      
      expect(result.current.prs).toEqual(mockPRs);
      expect(result.current.issues).toEqual(mockIssues);
      expect(result.current.error).toBe('Some error');
      
      act(() => {
        result.current.clearCache();
      });
      
      expect(result.current.prs).toEqual([]);
      expect(result.current.issues).toEqual([]);
      expect(result.current.ciStatuses).toEqual({});
      expect(result.current.lastFetchTime).toEqual({});
      expect(result.current.error).toBeNull();
    });

    it('should clear error correctly', () => {
      const { result } = renderHook(() => useGitHubStore());
      
      act(() => {
        useGitHubStore.setState({ error: 'Some error' });
      });
      
      expect(result.current.error).toBe('Some error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });
});