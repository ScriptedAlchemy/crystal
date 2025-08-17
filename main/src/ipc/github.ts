import { IpcMain } from 'electron';
import { spawn } from 'child_process';
import type { AppServices } from './types';
import type { GitHubPR, GitHubIssue, GitHubCIStatus, CreateFixSessionRequest } from '../../../shared/types';
import type { 
  GitHubCLIPullRequest, 
  GitHubCLIIssue, 
  GitHubCLICheck, 
  GitHubCLIStatusCheckRollup,
  GitHubCLIPRView,
  GitHubCLIIssueView,
  GitHubCLIResponse 
} from '../types/github-cli';
// Mock data removed - using only real GitHub CLI data

// Simple in-memory cache for CI status with 5-minute TTL
interface CIStatusCacheEntry {
  data: GitHubCIStatus;
  timestamp: number;
}

const ciStatusCache = new Map<string, CIStatusCacheEntry>();
const CI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function registerGitHubHandlers(ipcMain: IpcMain, services: AppServices): void {
  const { sessionManager, databaseService, claudeCodeManager, logger } = services;

  // Execute GitHub CLI command
  const executeGitHubCLI = async <T = unknown>(args: string[], cwd?: string): Promise<GitHubCLIResponse<T>> => {
    return new Promise((resolve) => {
      const childProcess = spawn('gh', args, {
        cwd: cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          try {
            const data = stdout.trim() ? JSON.parse(stdout) : null;
            resolve({ success: true, data });
          } catch (error) {
            // If JSON parsing fails, return raw stdout as unknown type
            resolve({ success: true, data: stdout.trim() as T });
          }
        } else {
          logger?.error(`GitHub CLI command failed: ${stderr}`);
          resolve({ 
            success: false, 
            error: stderr || `Command failed with exit code ${code}` 
          });
        }
      });

      childProcess.on('error', (error: Error) => {
        logger?.error(`GitHub CLI process error: ${error.message}`);
        resolve({ 
          success: false, 
          error: `GitHub CLI not found or failed to start: ${error.message}` 
        });
      });
    });
  };

  // Get pull requests
  ipcMain.handle('github:get-prs', async (_event, projectId: number) => {
    try {
      const project = databaseService.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const result = await executeGitHubCLI<GitHubCLIPullRequest[]>([
        'pr', 'list',
        '--state', 'all',  // Get all PRs including closed and merged
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels,assignees,isDraft,mergeable,headRefName,baseRefName',
        '--limit', '50'
      ], project.path);

      if (!result.success) {
        logger?.error('GitHub CLI failed to fetch PRs:', new Error(result.error || 'Unknown error'));
        return { success: false, error: result.error || 'Failed to fetch PRs from GitHub' };
      }

      const prs: GitHubPR[] = (result.data || []).map((pr) => ({
        id: `pr-${pr.number}`,
        number: pr.number,
        title: pr.title,
        state: (pr.state?.toLowerCase() || 'open') as 'open' | 'closed' | 'merged', // Convert to lowercase for consistency
        author: pr.author?.login || 'unknown',
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        url: pr.url,
        labels: pr.labels?.map((l) => l.name) || [],
        assignees: pr.assignees?.map((a) => a.login) || [],
        isDraft: pr.isDraft || false,
        mergeable: pr.mergeable !== 'CONFLICTING',
        headBranch: pr.headRefName,
        baseBranch: pr.baseRefName,
      }));

      return { success: true, data: prs };
    } catch (error) {
      logger?.error('Failed to get PRs:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get pull requests' 
      };
    }
  });

  // Get issues
  ipcMain.handle('github:get-issues', async (_event, projectId: number) => {
    try {
      const project = databaseService.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const result = await executeGitHubCLI<GitHubCLIIssue[]>([
        'issue', 'list',
        '--state', 'all',  // Get all issues including closed
        '--json', 'number,title,state,author,createdAt,updatedAt,url,labels,assignees',
        '--limit', '50'
      ], project.path);

      if (!result.success) {
        logger?.error('GitHub CLI failed to fetch issues:', new Error(result.error || 'Unknown error'));
        return { success: false, error: result.error || 'Failed to fetch issues from GitHub' };
      }

      const issues: GitHubIssue[] = (result.data || []).map((issue) => ({
        id: `issue-${issue.number}`,
        number: issue.number,
        title: issue.title,
        state: (issue.state?.toLowerCase() || 'open') as 'open' | 'closed', // Convert to lowercase for consistency
        author: issue.author?.login || 'unknown',
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        url: issue.url,
        labels: issue.labels?.map((l) => l.name) || [],
        assignees: issue.assignees?.map((a) => a.login) || [],
        isPullRequest: false
      }));

      return { success: true, data: issues };
    } catch (error) {
      logger?.error('Failed to get issues:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get issues' 
      };
    }
  });

  // Get CI status for a PR
  ipcMain.handle('github:get-ci-status', async (_event, projectId: number, prNumber: number) => {
    try {
      const project = databaseService.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Check cache first
      const cacheKey = `${projectId}-${prNumber}`;
      const cached = ciStatusCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CI_CACHE_TTL) {
        logger?.info(`Using cached CI status for PR #${prNumber}`);
        return { success: true, data: cached.data };
      }

      // Use simpler gh pr checks command first
      const result = await executeGitHubCLI<GitHubCLICheck[]>([
        'pr', 'checks', prNumber.toString(),
        '--json', 'state,conclusion,name,detailsUrl'
      ], project.path);

      if (!result.success) {
        // Try alternative command to get PR status
        const statusResult = await executeGitHubCLI<{ statusCheckRollup?: GitHubCLIStatusCheckRollup[] }>([
          'pr', 'view', prNumber.toString(),
          '--json', 'statusCheckRollup'
        ], project.path);
        
        if (!statusResult.success) {
          logger?.warn(`No CI status available for PR #${prNumber}`);
          // Return empty CI status instead of mock data
          return { 
            success: true, 
            data: {
              status: 'pending' as const,
              totalCount: 0,
              successCount: 0,
              checks: [],
              checkRuns: []
            }
          };
        }
        
        // Parse status check rollup data
        const rollupData = statusResult.data?.statusCheckRollup || [];
        const checks = Array.isArray(rollupData) ? rollupData : [];
        let overallStatus: 'pending' | 'success' | 'failure' | 'error' = 'success';
        
        if (checks.length === 0) {
          overallStatus = 'pending';
        } else {
          const successCount = checks.filter((check) => 
            check.conclusion === 'SUCCESS' || check.conclusion === 'success'
          ).length;
          const hasFailure = checks.some((check) => 
            check.conclusion === 'FAILURE' || check.conclusion === 'failure' || 
            check.conclusion === 'CANCELLED' || check.conclusion === 'cancelled'
          );
          const hasPending = checks.some((check) => 
            check.state === 'PENDING' || check.state === 'pending' || 
            check.state === 'IN_PROGRESS' || check.state === 'in_progress' ||
            (!check.state && !check.conclusion) // Sometimes state is null for pending
          );
          
          // If there are checks but none succeeded, it's a failure
          if (successCount === 0 && !hasPending) {
            overallStatus = 'failure';
          } else if (hasFailure) {
            overallStatus = 'failure';
          } else if (hasPending) {
            overallStatus = 'pending';
          }
        }
        
        const ciStatus: GitHubCIStatus = {
          status: overallStatus,
          totalCount: checks.length,
          successCount: checks.filter((c) => 
            c.conclusion === 'SUCCESS' || c.conclusion === 'success'
          ).length,
          checks: checks.map((check) => ({
            name: check.name,
            status: check.conclusion ? 'completed' : 
                    (check.state?.toUpperCase() === 'IN_PROGRESS' || check.state === 'in_progress') ? 'in_progress' : 'queued',
            conclusion: check.conclusion?.toLowerCase() as any, // Normalize to lowercase
            url: check.detailsUrl,
            output: null
          })),
          checkRuns: checks.map((check) => ({
            name: check.name,
            status: check.state as string || undefined,
            conclusion: check.conclusion as string || undefined,
            url: check.detailsUrl
          }))
        };
        
        // Cache the result
        ciStatusCache.set(cacheKey, {
          data: ciStatus,
          timestamp: Date.now()
        });
        
        return { success: true, data: ciStatus };
      }

      // The result.data is already parsed as an array of checks
      const checks: GitHubCLICheck[] = result.data || [];
      
      let overallStatus: 'pending' | 'success' | 'failure' | 'error' = 'success';
      
      if (checks.length === 0) {
        overallStatus = 'pending';
      } else {
        const successCount = checks.filter((check) => check.conclusion === 'success').length;
        const hasFailure = checks.some((check) => 
          check.conclusion === 'failure' || check.conclusion === 'cancelled' || check.conclusion === 'timed_out'
        );
        const hasPending = checks.some((check) => 
          check.status === 'queued' || check.status === 'in_progress'
        );
        
        // If there are checks but none succeeded, it's a failure
        if (successCount === 0 && !hasPending) {
          overallStatus = 'failure';
        } else if (hasFailure) {
          overallStatus = 'failure';
        } else if (hasPending) {
          overallStatus = 'pending';
        }
      }

      const ciStatus: GitHubCIStatus = {
        status: overallStatus,
        totalCount: checks.length,
        successCount: checks.filter((c) => c.conclusion === 'success').length,
        failureCount: checks.filter((c) => c.conclusion === 'failure' || c.conclusion === 'cancelled').length,
        checks: checks.map((check) => ({
          name: check.name,
          status: check.status === 'completed' ? 'completed' : 
                  check.status === 'in_progress' ? 'in_progress' : 'queued',
          conclusion: check.conclusion,
          url: check.details_url || check.detailsUrl,
          startedAt: check.started_at,
          completedAt: check.completed_at,
          output: check.output ? {
            title: check.output.title,
            summary: check.output.summary,
            text: check.output.text
          } : null
        })),
        checkRuns: checks.map((check) => ({
          name: check.name,
          status: check.status || check.state,
          conclusion: check.conclusion,
          url: check.details_url || check.detailsUrl
        }))
      };

      // Cache the result
      ciStatusCache.set(cacheKey, {
        data: ciStatus,
        timestamp: Date.now()
      });

      return { success: true, data: ciStatus };
    } catch (error) {
      logger?.error('Failed to get CI status:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get CI status' 
      };
    }
  });

  // Get CI logs for a PR
  ipcMain.handle('github:get-ci-logs', async (_event, projectId: number, prNumber: number) => {
    try {
      const project = databaseService.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Get the failed check runs first
      const checksResult = await executeGitHubCLI<GitHubCLICheck[]>([
        'pr', 'checks', prNumber.toString(),
        '--json', 'state,conclusion,name,detailsUrl'
      ], project.path);

      if (!checksResult.success) {
        return checksResult;
      }

      const failedChecks = (checksResult.data || []).filter((check) => 
        check.conclusion === 'failure' || check.conclusion === 'cancelled'
      );

      if (failedChecks.length === 0) {
        return { success: true, data: 'No failed CI checks found.' };
      }

      // For now, return a summary of failed checks
      // In a real implementation, you might fetch actual logs from the CI system
      const logSummary = failedChecks.map((check) => 
        `❌ ${check.name}: ${check.conclusion}\nURL: ${check.detailsUrl}`
      ).join('\n\n');

      return { success: true, data: logSummary };
    } catch (error) {
      logger?.error('Failed to get CI logs:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get CI logs' 
      };
    }
  });

  // Create a fix session for PR or Issue
  ipcMain.handle('github:create-fix-session', async (_event, request: CreateFixSessionRequest) => {
    try {
      const project = databaseService.getProject(request.projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      let prompt = '';
      let branchName = '';
      
      if (request.type === 'pr') {
        // Use provided details or fetch from GitHub
        if (request.title && request.body !== undefined) {
          // Use provided details (from frontend)
          prompt = `Fix CI failures for PR #${request.prNumber}: ${request.title}\n\n`;
          if (request.body) {
            prompt += `PR Description:\n${request.body}\n\n`;
          }
          branchName = `fix-pr-${request.prNumber}`;
        } else {
          // Fetch PR details from GitHub
          const prResult = await executeGitHubCLI<GitHubCLIPRView>([
            'pr', 'view', request.prNumber.toString(),
            '--json', 'title,body,headRefName'
          ], project.path);

          if (!prResult.success) {
            return prResult;
          }

          const pr = prResult.data;
          branchName = pr.headRefName;
          
          prompt = `Fix CI failures for PR #${request.prNumber}: ${pr.title}\n\n`;
          if (pr.body) {
            prompt += `PR Description:\n${pr.body}\n\n`;
          }
        }
        
        if (request.ciLogs) {
          prompt += `CI Failure Logs:\n${request.ciLogs}\n\n`;
        }
        prompt += 'Please analyze the CI failures, run tests locally to reproduce the issues, and fix them. Make sure all tests pass before committing.';
      } else {
        // Use issue number if provided
        const issueNumber = request.issueNumber || request.prNumber;
        
        // Use provided details or fetch from GitHub
        if (request.title && request.body !== undefined) {
          // Use provided details (from frontend)
          prompt = `Investigate and fix issue #${issueNumber}: ${request.title}\n\n`;
          if (request.body) {
            prompt += `Issue Description:\n${request.body}\n\n`;
          }
          branchName = `fix-issue-${issueNumber}`;
        } else {
          // Fetch issue details from GitHub
          const issueResult = await executeGitHubCLI<GitHubCLIIssueView>([
            'issue', 'view', issueNumber.toString(),
            '--json', 'title,body'
          ], project.path);

          if (!issueResult.success) {
            return issueResult;
          }

          const issue = issueResult.data;
          branchName = `fix-issue-${issueNumber}`;
          
          prompt = `Investigate and fix issue #${issueNumber}: ${issue.title}\n\n`;
          if (issue.body) {
            prompt += `Issue Description:\n${issue.body}\n\n`;
          }
        }
        
        prompt += 'Please investigate this issue and implement a fix. After fixing, create a pull request with your changes.';
      }

      // Create session with Claude Code CLI
      const itemNumber = request.type === 'pr' ? request.prNumber : (request.issueNumber || request.prNumber);
      const sessionName = `Fix ${request.type} #${itemNumber}`;
      const worktreeName = `fix-${request.type}-${itemNumber}`;
      const worktreePath = project.path; // Use project path as base
      
      const session = sessionManager.createSession(
        sessionName,
        worktreePath,
        prompt,
        worktreeName,
        'ignore', // permissionMode - Use ignore mode for GitHub workflows
        request.projectId,
        false, // isMainRepo
        false, // autoCommit - Disabled for GitHub workflows
        undefined, // folderId
        'claude-sonnet-4-20250514', // model - Use Sonnet for complex fixes
        undefined, // baseCommit
        branchName, // baseBranch
        'structured' // commitMode
      );

      return { 
        success: true, 
        data: { 
          sessionId: session.id,
          message: `Created fix session for ${request.type} #${request.prNumber}` 
        } 
      };
    } catch (error) {
      logger?.error('Failed to create fix session:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create fix session' 
      };
    }
  });

  // Create PR from current branch
  ipcMain.handle('github:create-pr', async (_event, projectId: number, title: string, body?: string) => {
    try {
      const project = databaseService.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const args = ['pr', 'create', '--title', title];
      if (body) {
        args.push('--body', body);
      }

      const result = await executeGitHubCLI(args, project.path);
      return result;
    } catch (error) {
      logger?.error('Failed to create PR:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create pull request' 
      };
    }
  });
}