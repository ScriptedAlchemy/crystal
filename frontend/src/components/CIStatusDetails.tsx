import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Terminal,
  Loader2
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { GitHubCIStatus } from '../../../shared/types';

interface CIStatusDetailsProps {
  ciStatus: GitHubCIStatus;
  onFixWithAI: () => void;
  isCreatingSession?: boolean;
  expandedByDefault?: boolean;
}

export const CIStatusDetails: React.FC<CIStatusDetailsProps> = ({
  ciStatus,
  onFixWithAI,
  isCreatingSession = false,
  expandedByDefault = false
}) => {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault);

  const statusConfig = {
    pending: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
      icon: Clock, 
      text: 'Running',
      bgHover: 'hover:bg-yellow-50',
      testId: 'ci-running'
    },
    success: { 
      color: 'bg-green-100 text-green-800 border-green-300', 
      icon: CheckCircle, 
      text: 'Passed',
      bgHover: 'hover:bg-green-50',
      testId: 'ci-passed'
    },
    failure: { 
      color: 'bg-red-100 text-red-800 border-red-300', 
      icon: XCircle, 
      text: 'Failed',
      bgHover: 'hover:bg-red-50',
      testId: 'ci-failed'
    },
    error: { 
      color: 'bg-red-100 text-red-800 border-red-300', 
      icon: AlertCircle, 
      text: 'Error',
      bgHover: 'hover:bg-red-50',
      testId: 'ci-error'
    }
  };

  const config = statusConfig[ciStatus.status];
  const Icon = config.icon;

  // Get failed checks
  const failedChecks = ciStatus.checks?.filter(
    check => check.conclusion === 'failure' || check.conclusion === 'cancelled' || check.conclusion === 'timed_out'
  ) || [];

  const runningChecks = ciStatus.checks?.filter(
    check => check.status === 'in_progress'
  ) || [];

  const successChecks = ciStatus.checks?.filter(
    check => check.conclusion === 'success'
  ) || [];

  // If expandedByDefault is true, show details directly without a button
  if (expandedByDefault) {
    return (
      <div className="w-full" data-testid="ci-status-details">
        <div className="space-y-2" data-testid="ci-status-expanded">
          {/* Show status summary */}
          <div className={cn(
            'px-3 py-2 rounded-md text-sm font-medium border flex items-center gap-2',
            config.color
          )}>
            <Icon className="w-4 h-4" />
            <span>{config.text}</span>
            {ciStatus.totalCount && ciStatus.totalCount > 0 && (
              <span>({ciStatus.successCount || 0}/{ciStatus.totalCount})</span>
            )}
          </div>

          {/* Failed Checks */}
          {failedChecks.length > 0 && (
            <div data-testid="ci-failed-checks">
              <h4 className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Failed Checks ({failedChecks.length})
              </h4>
              <div className="space-y-1">
                {failedChecks.map((check, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2" data-testid="ci-failed-check-item">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-primary font-medium truncate" data-testid="ci-check-name">
                        {check.name}
                      </div>
                      {check.output?.summary && (
                        <div className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                          {check.output.summary}
                        </div>
                      )}
                      {check.completedAt && (
                        <div className="text-xs text-text-tertiary mt-0.5">
                          Failed at {new Date(check.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                    {check.url && (
                      <a
                        href={check.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                        title="View in GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Running Checks */}
          {runningChecks.length > 0 && (
            <div data-testid="ci-running-checks">
              <h4 className="text-xs font-semibold text-yellow-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Running ({runningChecks.length})
              </h4>
              <div className="space-y-1">
                {runningChecks.map((check, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2" data-testid="ci-running-check-item">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />
                      <span className="text-xs text-text-primary" data-testid="ci-running-check-name">{check.name}</span>
                    </div>
                    {check.url && (
                      <a
                        href={check.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                        title="View in GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Checks Summary */}
          {successChecks.length > 0 && (
            <div data-testid="ci-success-checks">
              <h4 className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Passed ({successChecks.length})
              </h4>
              <div className="text-xs text-text-secondary" data-testid="ci-success-summary">
                {successChecks.slice(0, 3).map(check => check.name).join(', ')}
                {successChecks.length > 3 && ` and ${successChecks.length - 3} more`}
              </div>
            </div>
          )}

          {/* If no checks data available, show raw data */}
          {!failedChecks.length && !runningChecks.length && !successChecks.length && (
            <div className="text-xs text-text-secondary">
              No detailed check information available. Status: {ciStatus.status}
              {ciStatus.totalCount && ciStatus.totalCount > 0 && (
                <span> ({ciStatus.successCount || 0} of {ciStatus.totalCount} checks passed)</span>
              )}
            </div>
          )}

          {/* Fix with AI Button */}
          {failedChecks.length > 0 && (
            <div className="pt-2 border-t border-border-primary">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFixWithAI();
                }}
                disabled={isCreatingSession}
                data-testid="fix-with-ai-button"
                className={cn(
                  "w-full px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  "bg-red-600 text-white hover:bg-red-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-1.5"
                )}
              >
                {isCreatingSession ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    Fix with AI
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal mode with expandable button
  return (
    <div className="inline-block" data-testid="ci-status-details">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="ci-badge"
        data-status={ciStatus.status}
        className={cn(
          'px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all',
          config.color,
          config.bgHover,
          'cursor-pointer'
        )}
        title={isExpanded ? 'Hide CI details' : 'Show CI details'}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Icon className="w-3.5 h-3.5" />
        <span data-testid={config.testId}>{config.text}</span>
        {ciStatus.totalCount && ciStatus.totalCount > 0 && (
          <span className="ml-1">
            ({ciStatus.successCount || 0}/{ciStatus.totalCount})
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-surface-secondary rounded-md border border-border-primary" data-testid="ci-status-expanded">
          <div className="space-y-2">
            {/* Failed Checks */}
            {failedChecks.length > 0 && (
              <div data-testid="ci-failed-checks">
                <h4 className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Failed Checks ({failedChecks.length})
                </h4>
                <div className="space-y-1">
                  {failedChecks.map((check, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2" data-testid="ci-failed-check-item">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text-primary font-medium truncate" data-testid="ci-check-name">
                          {check.name}
                        </div>
                        {check.output?.summary && (
                          <div className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                            {check.output.summary}
                          </div>
                        )}
                        {check.completedAt && (
                          <div className="text-xs text-text-tertiary mt-0.5">
                            Failed at {new Date(check.completedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      {check.url && (
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                          title="View in GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Running Checks */}
            {runningChecks.length > 0 && (
              <div data-testid="ci-running-checks">
                <h4 className="text-xs font-semibold text-yellow-700 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Running ({runningChecks.length})
                </h4>
                <div className="space-y-1">
                  {runningChecks.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2" data-testid="ci-running-check-item">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />
                        <span className="text-xs text-text-primary" data-testid="ci-running-check-name">{check.name}</span>
                      </div>
                      {check.url && (
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                          title="View in GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Checks Summary */}
            {successChecks.length > 0 && (
              <div data-testid="ci-success-checks">
                <h4 className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Passed ({successChecks.length})
                </h4>
                <div className="text-xs text-text-secondary" data-testid="ci-success-summary">
                  {successChecks.slice(0, 3).map(check => check.name).join(', ')}
                  {successChecks.length > 3 && ` and ${successChecks.length - 3} more`}
                </div>
              </div>
            )}

            {/* Fix with AI Button */}
            {failedChecks.length > 0 && (
              <div className="pt-2 border-t border-border-primary">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFixWithAI();
                  }}
                  disabled={isCreatingSession}
                  data-testid="fix-with-ai-button"
                  className={cn(
                    "w-full px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    "bg-red-600 text-white hover:bg-red-700",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-1.5"
                  )}
                >
                  {isCreatingSession ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-3.5 h-3.5" />
                      Fix with AI
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};