// Shared types between frontend and backend

export type CommitMode = 'structured' | 'checkpoint' | 'disabled';

export interface CommitModeSettings {
  mode: CommitMode;
  structuredPromptTemplate?: string;
  checkpointPrefix?: string;
  allowClaudeTools?: boolean;
}

export interface ProjectCharacteristics {
  hasHusky: boolean;
  hasChangeset: boolean;
  hasConventionalCommits: boolean;
  suggestedMode: CommitMode;
}

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
}

export interface FinalizeSessionOptions {
  sessionId: string;
  commitMessage?: string;
  shouldCommit?: boolean;
}

// GitHub Integration Types
export interface GitHubPR {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
  assignees: string[];
  isDraft: boolean;
  mergeable: boolean;
  ciStatus?: 'pending' | 'success' | 'failure' | 'error';
  headBranch: string;
  baseBranch: string;
  body?: string;
  reviewDecision?: string;
  comments?: number;
}

export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
  assignees: string[];
  isPullRequest: false;
  comments?: number;
  milestone?: string;
}

export interface GitHubCIStatus {
  status: 'pending' | 'success' | 'failure' | 'error';
  conclusion?: string;
  logs?: string;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  checks: Array<{
    name: string;
    status: 'completed' | 'in_progress' | 'queued';
    conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | 'neutral';
    url?: string;
    startedAt?: string;
    completedAt?: string;
    output?: {
      title?: string;
      summary?: string;
      text?: string;
    } | null;
  }>;
  checkRuns: Array<{
    name: string;
    status?: string;
    conclusion?: string;
    url?: string;
  }>;
}

export interface CreateFixSessionRequest {
  projectId: number;
  type: 'pr' | 'issue';
  prNumber: number;
  issueNumber?: number;
  ciLogs?: string;
  title?: string;
  body?: string;
}

export interface CreatePRRequest {
  projectId: number;
  title: string;
  body?: string;
}

// Default commit mode settings
export const DEFAULT_COMMIT_MODE_SETTINGS: CommitModeSettings = {
  mode: 'checkpoint',
  checkpointPrefix: 'checkpoint: ',
};

// Default structured prompt template
export const DEFAULT_STRUCTURED_PROMPT_TEMPLATE = `
After completing the requested changes, please create a git commit with an appropriate message. Follow these guidelines:
- Use Conventional Commits format (feat:, fix:, docs:, style:, refactor:, test:, chore:)
- Include a clear, concise description of the changes
- Only commit files that are directly related to this task
- If this project uses changesets and you've made a user-facing change, you may run 'pnpm changeset' if appropriate
`.trim();