import React, { useState, useEffect } from 'react';
import { 
  Github, 
  GitPullRequest, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  X, 
  RefreshCw,
  ExternalLink,
  Terminal,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useGitHubStore } from '../stores/githubStore';
import { CIStatusDetails } from './CIStatusDetails';
import type { GitHubPR, GitHubIssue } from '../../../shared/types';

type GitHubPRWithType = GitHubPR & { type: 'pr' };
type GitHubIssueWithType = GitHubIssue & { type: 'issue' };
type GitHubData = GitHubPRWithType | GitHubIssueWithType;

interface GitHubDashboardProps {
  projectId: number;
  projectName: string;
}

type FilterType = 'all' | 'prs' | 'issues';
type FilterState = 'all' | 'open' | 'closed';

export const GitHubDashboard: React.FC<GitHubDashboardProps> = ({ 
  projectId, 
  projectName 
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterState, setFilterState] = useState<FilterState>('open');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Use GitHub store
  const {
    prs,
    issues,
    ciStatuses,
    fetchPRs,
    fetchIssues,
    fetchCIStatus,
    createFixSession,
    isLoadingPRs,
    isLoadingIssues,
    isCreatingSession,
    error
  } = useGitHubStore();
  
  const loading = isLoadingPRs || isLoadingIssues;

  // Fetch GitHub data
  useEffect(() => {
    fetchPRs(projectId);
    fetchIssues(projectId);
  }, [projectId, fetchPRs, fetchIssues]);

  // Fetch CI status for open PRs only
  useEffect(() => {
    prs.forEach(pr => {
      // Only fetch CI status for open PRs (not closed or merged)
      if (pr.state === 'open' && !ciStatuses[pr.number]) {
        fetchCIStatus(projectId, pr.number);
      }
    });
  }, [prs, projectId, fetchCIStatus, ciStatuses]);

  const handleRefresh = () => {
    fetchPRs(projectId, true);
    fetchIssues(projectId, true);
    // Re-fetch CI statuses with force=true to bypass cache (open PRs only)
    prs.forEach(pr => {
      if (pr.state === 'open') {
        fetchCIStatus(projectId, pr.number, true);
      }
    });
  };

  // Combine PRs and Issues with type information
  const allData: GitHubData[] = [
    ...prs.map(pr => ({ ...pr, type: 'pr' as const })),
    ...issues.map(issue => ({ ...issue, type: 'issue' as const }))
  ];

  // Apply filters
  const filteredData = allData.filter(item => {
    // Filter by type
    if (filterType === 'prs' && item.type !== 'pr') return false;
    if (filterType === 'issues' && item.type !== 'issue') return false;
    
    // Filter by state
    if (filterState === 'all') return true;
    if (filterState === 'closed') {
      return item.state === 'closed' || (item.type === 'pr' && (item as GitHubPR).state === 'merged');
    }
    return item.state === 'open';
  });

  const handleCreateFixSession = async (item: GitHubData) => {
    const result = await createFixSession(projectId, item);
    
    if (result.success) {
      console.log('Fix session created:', result.sessionId);
    } else {
      console.error('Failed to create fix session:', result.error);
    }
  };

  const getStatusIcon = (item: GitHubData) => {
    if (item.type === 'pr') {
      const pr = item as GitHubPR;
      if (pr.state === 'merged') {
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      }
      if (pr.state === 'closed') {
        return <X className="w-4 h-4 text-red-500" />;
      }
      if (pr.isDraft) {
        return <Clock className="w-4 h-4 text-gray-500" />;
      }
      return <GitPullRequest className="w-4 h-4 text-green-500" />;
    } else {
      const issue = item as GitHubIssue;
      if (issue.state === 'closed') {
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      }
      return <AlertCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleFixCI = async (pr: GitHubPR) => {
    const ciStatus = ciStatuses[pr.number];
    if (!ciStatus) return;
    
    // Get failed check details to include in the fix prompt
    const failedChecks = ciStatus.checks?.filter(
      check => check.conclusion === 'failure' || check.conclusion === 'cancelled'
    ) || [];
    
    const failureDetails = failedChecks.map(check => 
      `- ${check.name}: ${check.conclusion}${check.output?.summary ? `\n  ${check.output.summary}` : ''}`
    ).join('\n');
    
    const result = await createFixSession(projectId, {
      ...pr,
      type: 'pr' as const,
      // Include failure details in the session creation
      body: `${pr.body || ''}\n\nCI Failures:\n${failureDetails}`
    });
    
    if (result.success) {
      console.log('CI fix session created:', result.sessionId);
    } else {
      console.error('Failed to create CI fix session:', result.error);
    }
  };

  if (loading && prs.length === 0 && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-interactive mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading GitHub data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-primary font-medium mb-2">Failed to load GitHub data</p>
          <p className="text-text-secondary text-sm">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-interactive text-white rounded-md hover:bg-interactive/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="github-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6" data-testid="github-header">
        <div className="flex items-center gap-3">
          <Github className="w-6 h-6 text-text-primary" />
          <h1 className="text-2xl font-bold text-text-primary">GitHub Integration</h1>
          <span className="text-sm text-text-secondary">for {projectName}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          data-testid="refresh-github"
          className={cn(
            "p-2 rounded-md transition-colors",
            loading 
              ? "text-text-tertiary cursor-not-allowed" 
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          )}
          aria-label="Refresh GitHub data"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 mb-6" data-testid="github-filters">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">Type:</span>
          <div className="flex rounded-lg border border-border-primary overflow-hidden">
            {(['all', 'prs', 'issues'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                data-testid={`filter-type-${type}`}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  filterType === type
                    ? 'bg-interactive text-white'
                    : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'
                )}
              >
                {type === 'all' ? 'All' : type === 'prs' ? 'Pull Requests' : 'Issues'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">State:</span>
          <div className="flex rounded-lg border border-border-primary overflow-hidden">
            {(['all', 'open', 'closed'] as FilterState[]).map((state) => (
              <button
                key={state}
                onClick={() => setFilterState(state)}
                data-testid={`filter-state-${state}`}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  filterState === state
                    ? 'bg-interactive text-white'
                    : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'
                )}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto" data-testid="github-content">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <Github className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No items found matching the current filters</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="github-items-list">
            {filteredData.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              const isPR = item.type === 'pr';
              const prItem = item as GitHubPR;
              const ciStatus = isPR ? ciStatuses[prItem.number] : undefined;
              
              return (
              <div
                key={item.id}
                data-testid={`github-item-${item.type}-${item.number}`}
                className="bg-surface-secondary rounded-lg border border-border-primary hover:bg-surface-hover transition-colors"
              >
                <div 
                  className={cn(
                    "p-4 cursor-pointer",
                    isPR && "hover:bg-surface-hover"
                  )}
                  onClick={() => isPR && toggleExpanded(item.id)}
                  data-testid={`github-item-${item.type}-${item.number}-header`}
                >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {isPR && (
                      <button
                        className="mt-1 p-0.5 hover:bg-surface-hover rounded"
                        data-testid={`pr-expand-toggle-${prItem.number}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>
                    )}
                    {getStatusIcon(item)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-text-tertiary" data-testid={`${item.type}-number-${item.number}`}>
                          #{item.number}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-surface-primary text-text-tertiary border border-border-primary" data-testid={`${item.type}-type-badge`}>
                          {item.type === 'pr' ? 'PR' : 'Issue'}
                        </span>
                        {item.type === 'pr' && (item as GitHubPR).isDraft && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-300" data-testid="pr-draft-badge">
                            Draft
                          </span>
                        )}
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-md border",
                          item.state === 'open' 
                            ? "bg-green-100 text-green-800 border-green-300" 
                            : item.type === 'pr' && (item as GitHubPR).state === 'merged'
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        )} data-testid={`${item.type}-state-${item.state}`}>
                          {item.type === 'pr' && (item as GitHubPR).state === 'merged' ? 'merged' : item.state}
                        </span>
                        {ciStatus && (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md border",
                              ciStatus.status === 'success'
                                ? "bg-green-100 text-green-800 border-green-300"
                                : ciStatus.status === 'failure'
                                ? "bg-red-100 text-red-800 border-red-300"
                                : ciStatus.status === 'pending'
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                : "bg-gray-100 text-gray-800 border-gray-300"
                            )}
                            data-testid={`pr-ci-status-${prItem.number}`}
                          >
                            {ciStatus.status === 'success' && <CheckCircle className="inline w-3 h-3 mr-1" />}
                            {ciStatus.status === 'failure' && <X className="inline w-3 h-3 mr-1" />}
                            {ciStatus.status === 'pending' && <Clock className="inline w-3 h-3 mr-1" />}
                            Passed ({ciStatus.successCount}/{ciStatus.totalCount})
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-text-primary mb-2" data-testid={`${item.type}-title`}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span data-testid={`${item.type}-author`}>by {item.author}</span>
                        <span data-testid={`${item.type}-date`}>{new Date(item.updatedAt).toLocaleDateString()}</span>
                        {item.type === 'pr' && (
                          <span data-testid="pr-branches">{(item as GitHubPR).headBranch} → {(item as GitHubPR).baseBranch}</span>
                        )}
                        {item.type === 'issue' && (item as GitHubIssue).comments !== undefined && (
                          <span data-testid="issue-comments">{(item as GitHubIssue).comments} comments</span>
                        )}
                      </div>
                      {item.labels.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Tag className="w-3.5 h-3.5 text-text-tertiary" />
                          {item.labels.slice(0, 3).map((label) => (
                            <span
                              key={label}
                              className="px-2 py-0.5 rounded-md bg-surface-primary text-text-tertiary text-xs border border-border-primary"
                              data-testid={`${item.type}-label`}
                            >
                              {label}
                            </span>
                          ))}
                          {item.labels.length > 3 && (
                            <span className="text-xs text-text-tertiary">
                              +{item.labels.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-md transition-colors"
                      aria-label="Open in GitHub"
                      data-testid={`${item.type}-external-link`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {item.type === 'issue' && item.state === 'open' && (
                      <button 
                        onClick={() => handleCreateFixSession(item)}
                        disabled={isCreatingSession === item.id}
                        data-testid={`investigate-issue-${item.number}`}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5",
                          "bg-interactive text-white hover:bg-interactive/90"
                        )}
                      >
                        {isCreatingSession === item.id ? 'Creating...' : (
                          <>
                            <Terminal className="w-3.5 h-3.5" />
                            Investigate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                </div>
                
                {/* Expanded CI Status Details for PRs */}
                {isPR && isExpanded && ciStatus && (
                  <div 
                    className="border-t border-border-primary p-4 bg-surface-primary"
                    data-testid={`pr-ci-details-${prItem.number}`}
                  >
                    <CIStatusDetails
                      ciStatus={ciStatus}
                      onFixWithAI={() => handleFixCI(prItem)}
                      isCreatingSession={isCreatingSession === item.id}
                      expandedByDefault={true}
                    />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};