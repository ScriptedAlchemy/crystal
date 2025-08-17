import type { GitHubPR, GitHubIssue, GitHubCIStatus } from '../../../shared/types';

// Mock data for testing GitHub integration when gh CLI is not available
export const mockPRs: GitHubPR[] = [
  {
    id: 'pr-100',
    number: 100,
    title: 'Fix critical performance regression in webpack build',
    state: 'open',
    author: 'john-doe',
    createdAt: '2024-08-10T10:00:00Z',
    updatedAt: '2024-08-15T14:30:00Z',
    url: 'https://github.com/module-federation/core/pull/100',
    labels: ['bug', 'performance', 'critical'],
    assignees: ['jane-smith'],
    isDraft: false,
    mergeable: true,
    headBranch: 'fix/webpack-perf',
    baseBranch: 'main',
    ciStatus: 'failure',
    body: `## Problem
The module federation plugin was experiencing significant performance degradation when loading remote modules, especially in development mode.

## Solution
- Implemented caching mechanism for remote module resolution
- Optimized webpack configuration for better tree-shaking
- Added lazy loading for non-critical modules

## Testing
- Performance tests show 45% improvement in load times
- All existing tests pass
- Added new performance benchmarks

Fixes #98`,
    reviewDecision: 'APPROVED',
    comments: 12
  },
  {
    id: 'pr-101',
    number: 101,
    title: 'Add support for React 19 concurrent features',
    state: 'open',
    author: 'alice-dev',
    createdAt: '2024-08-12T09:00:00Z',
    updatedAt: '2024-08-14T16:20:00Z',
    url: 'https://github.com/module-federation/core/pull/101',
    labels: ['enhancement', 'react'],
    assignees: ['bob-reviewer'],
    isDraft: true,
    mergeable: true,
    headBranch: 'feature/react-19',
    baseBranch: 'main',
    ciStatus: 'pending',
    body: `## Description
This PR adds support for React 19's new concurrent features including:

- Automatic batching improvements
- Suspense for data fetching
- New hooks for concurrent rendering

## Changes
- Updated React peer dependency to ^19.0.0
- Modified module federation runtime to support concurrent features
- Added compatibility layer for React 18 users

## Breaking Changes
None - fully backward compatible

## Testing
- [ ] Unit tests updated
- [ ] Integration tests passing
- [ ] Performance benchmarks completed`,
    reviewDecision: 'PENDING',
    comments: 5
  },
  {
    id: 'pr-99',
    number: 99,
    title: 'Update documentation for new API methods',
    state: 'merged',
    author: 'doc-writer',
    createdAt: '2024-08-08T11:00:00Z',
    updatedAt: '2024-08-13T10:00:00Z',
    url: 'https://github.com/module-federation/core/pull/99',
    labels: ['documentation'],
    assignees: [],
    isDraft: false,
    mergeable: true,
    headBranch: 'docs/api-updates',
    baseBranch: 'main',
    ciStatus: 'success'
  },
  {
    id: 'pr-98',
    number: 98,
    title: 'Refactor shared module resolution logic',
    state: 'closed',
    author: 'tech-lead',
    createdAt: '2024-08-05T14:00:00Z',
    updatedAt: '2024-08-11T09:30:00Z',
    url: 'https://github.com/module-federation/core/pull/98',
    labels: ['refactor', 'breaking-change'],
    assignees: ['senior-dev'],
    isDraft: false,
    mergeable: false,
    headBranch: 'refactor/module-resolution',
    baseBranch: 'main'
  },
  {
    id: 'pr-102',
    number: 102,
    title: 'Fix memory leak in development server',
    state: 'open',
    author: 'perf-engineer',
    createdAt: '2024-08-14T13:00:00Z',
    updatedAt: '2024-08-15T17:45:00Z',
    url: 'https://github.com/module-federation/core/pull/102',
    labels: ['bug', 'memory-leak', 'dev-server'],
    assignees: ['john-doe', 'jane-smith'],
    isDraft: false,
    mergeable: false, // Has conflicts
    headBranch: 'fix/memory-leak',
    baseBranch: 'main',
    ciStatus: 'success'
  }
];

export const mockIssues: GitHubIssue[] = [
  {
    id: 'issue-200',
    number: 200,
    title: 'Module federation fails with pnpm workspaces',
    state: 'open',
    author: 'user-reporter',
    createdAt: '2024-08-13T08:00:00Z',
    updatedAt: '2024-08-15T12:00:00Z',
    url: 'https://github.com/module-federation/core/issues/200',
    labels: ['bug', 'pnpm', 'help-wanted'],
    assignees: ['maintainer-1'],
    isPullRequest: false,
    comments: 12,
    milestone: 'v2.0.0'
  },
  {
    id: 'issue-201',
    number: 201,
    title: 'Feature Request: Support for Vite 5.0',
    state: 'open',
    author: 'feature-requester',
    createdAt: '2024-08-14T10:00:00Z',
    updatedAt: '2024-08-15T15:30:00Z',
    url: 'https://github.com/module-federation/core/issues/201',
    labels: ['enhancement', 'vite'],
    assignees: [],
    isPullRequest: false,
    comments: 5,
    milestone: 'v2.1.0'
  },
  {
    id: 'issue-199',
    number: 199,
    title: 'Documentation unclear about shared dependencies',
    state: 'closed',
    author: 'confused-user',
    createdAt: '2024-08-10T09:00:00Z',
    updatedAt: '2024-08-12T11:00:00Z',
    url: 'https://github.com/module-federation/core/issues/199',
    labels: ['documentation', 'good-first-issue'],
    assignees: ['doc-writer'],
    isPullRequest: false,
    comments: 3
  },
  {
    id: 'issue-202',
    number: 202,
    title: 'TypeScript types not exported correctly',
    state: 'open',
    author: 'ts-developer',
    createdAt: '2024-08-15T09:00:00Z',
    updatedAt: '2024-08-15T16:00:00Z',
    url: 'https://github.com/module-federation/core/issues/202',
    labels: ['bug', 'typescript', 'types'],
    assignees: ['ts-expert'],
    isPullRequest: false,
    comments: 8,
    milestone: 'v2.0.0'
  },
  {
    id: 'issue-198',
    number: 198,
    title: 'Performance degradation in v1.5.0',
    state: 'open',
    author: 'perf-monitor',
    createdAt: '2024-08-09T14:00:00Z',
    updatedAt: '2024-08-14T10:00:00Z',
    url: 'https://github.com/module-federation/core/issues/198',
    labels: ['bug', 'performance', 'regression'],
    assignees: ['perf-engineer', 'tech-lead'],
    isPullRequest: false,
    comments: 15,
    milestone: 'v1.5.1'
  }
];

export const mockCIStatuses: Record<number, GitHubCIStatus> = {
  100: {
    status: 'failure',
    totalCount: 5,
    successCount: 3,
    checks: [
      {
        name: 'Unit Tests',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/module-federation/core/actions/runs/123',
        output: { text: '✓ 1,234 tests passed\n✓ No failures detected' }
      },
      {
        name: 'Integration Tests',
        status: 'completed',
        conclusion: 'failure',
        url: 'https://github.com/module-federation/core/actions/runs/124',
        output: { 
          title: 'Integration Tests Failed',
          summary: '2 tests failed',
          text: '✗ 2 tests failed\n\nFailed tests:\n- Should handle remote module loading\n- Should resolve shared dependencies\n\nError: Timeout exceeded while loading remote module' 
        }
      },
      {
        name: 'E2E Tests',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/module-federation/core/actions/runs/125',
        output: { text: '✓ All E2E scenarios passed' }
      },
      {
        name: 'Build',
        status: 'completed',
        conclusion: 'failure',
        url: 'https://github.com/module-federation/core/actions/runs/126',
        output: { 
          title: 'Build Failed',
          summary: 'TypeScript compilation error',
          text: 'Build failed with error:\nTypeScript error in src/index.ts:45:12\nProperty "config" does not exist on type "ModuleFederationPlugin"' 
        }
      },
      {
        name: 'Lint',
        status: 'completed',
        conclusion: 'success',
        url: 'https://github.com/module-federation/core/actions/runs/127'
      }
    ],
    checkRuns: []
  },
  101: {
    status: 'pending',
    totalCount: 5,
    successCount: 2,
    checks: [
      {
        name: 'Unit Tests',
        status: 'completed',
        conclusion: 'success'
      },
      {
        name: 'Integration Tests',
        status: 'in_progress',
        output: { text: 'Running test suite...\n[===>      ] 30% complete' }
      },
      {
        name: 'E2E Tests',
        status: 'queued'
      },
      {
        name: 'Build',
        status: 'completed',
        conclusion: 'success'
      },
      {
        name: 'Lint',
        status: 'queued'
      }
    ],
    checkRuns: []
  },
  99: {
    status: 'success',
    totalCount: 3,
    successCount: 3,
    checks: [
      {
        name: 'Documentation Build',
        status: 'completed',
        conclusion: 'success',
        output: { text: 'Documentation built successfully\n✓ 45 pages generated' }
      },
      {
        name: 'Link Check',
        status: 'completed',
        conclusion: 'success',
        output: { text: '✓ All links valid' }
      },
      {
        name: 'Spell Check',
        status: 'completed',
        conclusion: 'success'
      }
    ],
    checkRuns: []
  },
  102: {
    status: 'success',
    totalCount: 5,
    successCount: 5,
    checks: [
      {
        name: 'Unit Tests',
        status: 'completed',
        conclusion: 'success'
      },
      {
        name: 'Memory Leak Detection',
        status: 'completed',
        conclusion: 'success',
        output: { text: '✓ No memory leaks detected\nHeap usage stable after 1000 iterations' }
      },
      {
        name: 'Performance Tests',
        status: 'completed',
        conclusion: 'success',
        output: { text: 'Performance benchmarks:\n- Build time: 2.3s (improved from 3.1s)\n- Memory usage: 145MB (down from 312MB)' }
      },
      {
        name: 'Build',
        status: 'completed',
        conclusion: 'success'
      },
      {
        name: 'Lint',
        status: 'completed',
        conclusion: 'success'
      }
    ],
    checkRuns: []
  }
};

// Helper function to get mock data with simulated delay
export async function getMockPRs(): Promise<GitHubPR[]> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return mockPRs;
}

export async function getMockIssues(): Promise<GitHubIssue[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockIssues;
}

export async function getMockCIStatus(prNumber: number): Promise<GitHubCIStatus | undefined> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return existing mock data if available
  if (mockCIStatuses[prNumber]) {
    return mockCIStatuses[prNumber];
  }
  
  // Generate default CI status for any PR number (for testing with real PR numbers)
  const statuses: Array<'success' | 'failure' | 'pending'> = ['success', 'failure', 'pending'];
  const randomStatus = statuses[prNumber % 3];
  
  return {
    status: randomStatus,
    totalCount: 3,
    successCount: randomStatus === 'success' ? 3 : randomStatus === 'pending' ? 0 : 1,
    checkRuns: [],
    checks: [
      {
        name: 'Build',
        status: randomStatus === 'pending' ? 'in_progress' : 'completed',
        conclusion: randomStatus === 'pending' ? undefined : randomStatus,
        url: `https://github.com/module-federation/core/actions/runs/${prNumber}`,
        output: randomStatus === 'failure' ? {
          title: 'Build Failed',
          summary: 'Build failed with errors',
          text: 'Error: Build step failed'
        } : undefined
      },
      {
        name: 'Tests',
        status: randomStatus === 'pending' ? 'queued' : 'completed',
        conclusion: randomStatus === 'pending' ? undefined : 'success',
        url: `https://github.com/module-federation/core/actions/runs/${prNumber + 1}`,
        output: undefined
      },
      {
        name: 'Lint',
        status: 'completed',
        conclusion: 'success',
        url: `https://github.com/module-federation/core/actions/runs/${prNumber + 2}`,
        output: undefined
      }
    ]
  };
}