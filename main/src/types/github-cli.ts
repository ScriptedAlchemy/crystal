// Type definitions for GitHub CLI JSON responses

export interface GitHubCLIPullRequest {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  author?: {
    login: string;
  };
  createdAt: string;
  updatedAt: string;
  url: string;
  labels?: Array<{
    name: string;
    color?: string;
  }>;
  assignees?: Array<{
    login: string;
  }>;
  isDraft?: boolean;
  mergeable?: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  headRefName: string;
  baseRefName: string;
}

export interface GitHubCLIIssue {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED';
  author?: {
    login: string;
  };
  createdAt: string;
  updatedAt: string;
  url: string;
  labels?: Array<{
    name: string;
    color?: string;
  }>;
  assignees?: Array<{
    login: string;
  }>;
  comments?: number;
}

export interface GitHubCLICheck {
  name: string;
  state?: 'pending' | 'in_progress' | 'completed';
  status?: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'neutral' | 'skipped';
  detailsUrl?: string;
  details_url?: string;
  started_at?: string;
  completed_at?: string;
  output?: {
    title?: string;
    summary?: string;
    text?: string;
  };
}

export interface GitHubCLIStatusCheckRollup {
  name: string;
  state?: 'pending' | 'in_progress' | 'completed' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null;
  conclusion?: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'neutral' | 'skipped' | 
               'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'TIMED_OUT' | 'ACTION_REQUIRED' | 'NEUTRAL' | 'SKIPPED';
  detailsUrl?: string;
}

export interface GitHubCLIPRView {
  title: string;
  body: string;
  headRefName: string;
  statusCheckRollup?: GitHubCLIStatusCheckRollup[];
}

export interface GitHubCLIIssueView {
  title: string;
  body: string;
}

export type GitHubCLIResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  data?: undefined;
};