import type { GitHubPR, GitHubIssue, GitHubCIStatus } from '../../shared/types';

// Mock GitHub PR data
export const mockGitHubPRs: GitHubPR[] = [
  {
    id: 'pr-123',
    number: 123,
    title: 'Fix authentication bug in login system',
    state: 'open',
    author: 'developer1',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T12:45:00Z',
    url: 'https://github.com/test/repo/pull/123',
    labels: ['bug', 'critical', 'security'],
    assignees: ['reviewer1'],
    isDraft: false,
    mergeable: false,
    headBranch: 'fix/auth-bug-123',
    baseBranch: 'main',
    ciStatus: 'failure'
  },
  {
    id: 'pr-124',
    number: 124,
    title: 'Add dark mode support to dashboard',
    state: 'open',
    author: 'developer2',
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
    url: 'https://github.com/test/repo/pull/124',
    labels: ['enhancement', 'ui', 'frontend'],
    assignees: ['designer1', 'reviewer2'],
    isDraft: true,
    mergeable: true,
    headBranch: 'feature/dark-mode',
    baseBranch: 'main',
    ciStatus: 'pending'
  },
  {
    id: 'pr-125',
    number: 125,
    title: 'Refactor database connection pooling',
    state: 'closed',
    author: 'developer3',
    createdAt: '2024-01-10T08:15:00Z',
    updatedAt: '2024-01-14T16:30:00Z',
    url: 'https://github.com/test/repo/pull/125',
    labels: ['refactor', 'backend', 'performance'],
    assignees: [],
    isDraft: false,
    mergeable: true,
    headBranch: 'refactor/db-pooling',
    baseBranch: 'main',
    ciStatus: 'success'
  },
  {
    id: 'pr-126',
    number: 126,
    title: 'Update dependencies to latest versions',
    state: 'merged',
    author: 'dependabot[bot]',
    createdAt: '2024-01-12T06:00:00Z',
    updatedAt: '2024-01-13T10:15:00Z',
    url: 'https://github.com/test/repo/pull/126',
    labels: ['dependencies', 'automated'],
    assignees: ['maintainer1'],
    isDraft: false,
    mergeable: true,
    headBranch: 'dependabot/npm_and_yarn/deps',
    baseBranch: 'main',
    ciStatus: 'success'
  }
];

// Mock GitHub Issue data
export const mockGitHubIssues: GitHubIssue[] = [
  {
    id: 'issue-456',
    number: 456,
    title: 'Add support for keyboard shortcuts',
    state: 'open',
    author: 'user1',
    createdAt: '2024-01-14T15:20:00Z',
    updatedAt: '2024-01-16T11:30:00Z',
    url: 'https://github.com/test/repo/issues/456',
    labels: ['enhancement', 'accessibility', 'ux'],
    assignees: ['developer2'],
    isPullRequest: false
  },
  {
    id: 'issue-457',
    number: 457,
    title: 'Performance issues with large datasets',
    state: 'open',
    author: 'user2',
    createdAt: '2024-01-13T09:45:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    url: 'https://github.com/test/repo/issues/457',
    labels: ['bug', 'performance', 'high-priority'],
    assignees: ['developer1', 'developer3'],
    isPullRequest: false
  },
  {
    id: 'issue-458',
    number: 458,
    title: 'Documentation needs updating for new API',
    state: 'closed',
    author: 'maintainer1',
    createdAt: '2024-01-08T12:00:00Z',
    updatedAt: '2024-01-12T16:45:00Z',
    url: 'https://github.com/test/repo/issues/458',
    labels: ['documentation', 'api'],
    assignees: [],
    isPullRequest: false
  },
  {
    id: 'issue-459',
    number: 459,
    title: 'Mobile responsive design improvements needed',
    state: 'open',
    author: 'designer1',
    createdAt: '2024-01-11T14:30:00Z',
    updatedAt: '2024-01-16T09:15:00Z',
    url: 'https://github.com/test/repo/issues/459',
    labels: ['enhancement', 'mobile', 'css', 'responsive'],
    assignees: ['developer2'],
    isPullRequest: false
  }
];

// Mock CI Status data
export const mockCIStatuses: Record<number, GitHubCIStatus> = {
  123: {
    status: 'failure',
    checkRuns: [
      {
        name: 'CI / build',
        status: 'completed',
        conclusion: 'failure',
        url: 'https://github.com/test/repo/actions/runs/123456'
      },
      {
        name: 'CI / test',
        status: 'completed',
        conclusion: 'failure',
        url: 'https://github.com/test/repo/actions/runs/123457'
      },
      {
        name: 'CI / lint',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/123458'
      }
    ]
  },
  124: {
    status: 'pending',
    checkRuns: [
      {
        name: 'CI / build',
        status: 'in_progress',
        conclusion: undefined,
        url: 'https://github.com/test/repo/actions/runs/124456'
      },
      {
        name: 'CI / test',
        status: 'queued',
        conclusion: undefined,
        url: 'https://github.com/test/repo/actions/runs/124457'
      }
    ]
  },
  125: {
    status: 'success',
    checkRuns: [
      {
        name: 'CI / build',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/125456'
      },
      {
        name: 'CI / test',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/125457'
      },
      {
        name: 'CI / lint',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/125458'
      },
      {
        name: 'CI / security-scan',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/125459'
      }
    ]
  },
  126: {
    status: 'success',
    checkRuns: [
      {
        name: 'CI / build',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/126456'
      },
      {
        name: 'CI / test',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/126457'
      }
    ]
  }
};

// Mock CI Logs
export const mockCILogs: Record<number, string> = {
  123: `❌ CI / build: failure
URL: https://github.com/test/repo/actions/runs/123456

❌ CI / test: failure
URL: https://github.com/test/repo/actions/runs/123457

Build failed with the following errors:
- Authentication module tests failing
- Missing environment variables
- Dependency version conflicts`,
  124: 'No failed CI checks found.',
  125: 'No failed CI checks found.',
  126: 'No failed CI checks found.'
};

// Mock API Responses
export const mockAPIResponses = {
  getPRs: {
    success: true,
    data: mockGitHubPRs
  },
  getIssues: {
    success: true,
    data: mockGitHubIssues
  },
  getCIStatus: (prNumber: number) => ({
    success: true,
    data: mockCIStatuses[prNumber] || {
      status: 'pending' as const,
      checkRuns: []
    }
  }),
  getCILogs: (prNumber: number) => ({
    success: true,
    data: mockCILogs[prNumber] || 'No CI logs available.'
  }),
  createFixSession: {
    success: true,
    data: {
      sessionId: 'mock-session-id-' + Date.now(),
      message: 'Created fix session successfully'
    }
  },
  createPR: {
    success: true,
    data: 'https://github.com/test/repo/pull/999'
  }
};

// Error responses for testing error handling
export const mockErrorResponses = {
  githubCLINotFound: {
    success: false,
    error: 'GitHub CLI not found or failed to start: Command not found'
  },
  authenticationFailed: {
    success: false,
    error: 'GitHub CLI authentication failed. Please run `gh auth login`'
  },
  projectNotFound: {
    success: false,
    error: 'Project not found'
  },
  networkError: {
    success: false,
    error: 'Network error: Unable to connect to GitHub API'
  },
  rateLimitExceeded: {
    success: false,
    error: 'GitHub API rate limit exceeded. Please try again later.'
  },
  sessionCreationFailed: {
    success: false,
    error: 'Failed to create session: Claude Code CLI not available'
  },
  prCreationFailed: {
    success: false,
    error: 'Failed to create pull request: No changes to commit'
  }
};

// Test data generators
export const generateMockPR = (overrides: Partial<GitHubPR> = {}): GitHubPR => {
  const baseId = Date.now();
  return {
    id: `pr-${baseId}`,
    number: baseId,
    title: `Test PR ${baseId}`,
    state: 'open',
    author: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: `https://github.com/test/repo/pull/${baseId}`,
    labels: ['test'],
    assignees: [],
    isDraft: false,
    mergeable: true,
    headBranch: `feature/test-${baseId}`,
    baseBranch: 'main',
    ciStatus: 'pending',
    ...overrides
  };
};

export const generateMockIssue = (overrides: Partial<GitHubIssue> = {}): GitHubIssue => {
  const baseId = Date.now();
  return {
    id: `issue-${baseId}`,
    number: baseId,
    title: `Test Issue ${baseId}`,
    state: 'open',
    author: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: `https://github.com/test/repo/issues/${baseId}`,
    labels: ['test'],
    assignees: [],
    isPullRequest: false,
    ...overrides
  };
};

export const generateMockCIStatus = (overrides: Partial<GitHubCIStatus> = {}): GitHubCIStatus => {
  return {
    status: 'success',
    checkRuns: [
      {
        name: 'CI / build',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/test/repo/actions/runs/999999'
      }
    ],
    ...overrides
  };
};

// Large dataset for performance testing
export const generateLargeDataset = (prCount: number = 50, issueCount: number = 30) => {
  const prs: GitHubPR[] = [];
  const issues: GitHubIssue[] = [];

  for (let i = 0; i < prCount; i++) {
    prs.push(generateMockPR({
      id: `pr-${1000 + i}`,
      number: 1000 + i,
      title: `Performance Test PR ${i + 1}`,
      state: i % 3 === 0 ? 'closed' : 'open',
      ciStatus: i % 4 === 0 ? 'failure' : i % 4 === 1 ? 'pending' : 'success',
      labels: [`label-${i % 5}`, `category-${i % 3}`]
    }));
  }

  for (let i = 0; i < issueCount; i++) {
    issues.push(generateMockIssue({
      id: `issue-${2000 + i}`,
      number: 2000 + i,
      title: `Performance Test Issue ${i + 1}`,
      state: i % 4 === 0 ? 'closed' : 'open',
      labels: [`priority-${i % 3}`, `type-${i % 4}`]
    }));
  }

  return { prs, issues };
};

// Mock project data
export const mockProject = {
  id: 1,
  name: 'test-project',
  path: '/path/to/test-project',
  githubRepo: 'test/repo'
};

// Mock session data
export const mockSession = {
  id: 'test-session-id',
  projectId: 1,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Helper functions for test setup
export const createMockAPIResponse = <T>(data: T, success: boolean = true, error?: string) => {
  return success ? { success, data } : { success, error: error || 'Mock error' };
};

export const createDelayedResponse = <T>(response: T, delay: number = 100) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(response), delay);
  });
};

// Test scenarios
export const testScenarios = {
  emptyRepository: {
    prs: [],
    issues: [],
    description: 'Repository with no PRs or issues'
  },
  mixedContent: {
    prs: mockGitHubPRs.slice(0, 2),
    issues: mockGitHubIssues.slice(0, 2),
    description: 'Repository with mixed PRs and issues'
  },
  onlyPRs: {
    prs: mockGitHubPRs,
    issues: [],
    description: 'Repository with only PRs'
  },
  onlyIssues: {
    prs: [],
    issues: mockGitHubIssues,
    description: 'Repository with only issues'
  },
  largeDataset: generateLargeDataset(100, 50),
  description: 'Repository with large dataset for performance testing'
};