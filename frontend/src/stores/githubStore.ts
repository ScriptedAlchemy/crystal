import { create } from 'zustand';
import type { GitHubPR, GitHubIssue, GitHubCIStatus } from '../../../shared/types';
import { API } from '../utils/api';

type GitHubPRWithType = GitHubPR & { type: 'pr' };
type GitHubIssueWithType = GitHubIssue & { type: 'issue' };
type GitHubData = GitHubPRWithType | GitHubIssueWithType;

interface GitHubStore {
  // Data state
  prs: GitHubPR[];
  issues: GitHubIssue[];
  ciStatuses: Record<number, GitHubCIStatus>; // prNumber -> CI status
  
  // Loading states
  isLoadingPRs: boolean;
  isLoadingIssues: boolean;
  isLoadingCIStatus: Set<number>; // PR numbers being loaded
  isCreatingSession: string | null; // item ID being processed
  
  // Error states
  error: string | null;
  
  // Cache management
  lastFetchTime: Record<number, number>; // projectId -> timestamp
  ciStatusFetchTime: Record<number, number>; // prNumber -> timestamp
  cacheTimeout: number; // 5 minutes
  ciCacheTimeout: number; // 2 minutes for CI status
  
  // Actions
  fetchPRs: (projectId: number, force?: boolean) => Promise<void>;
  fetchIssues: (projectId: number, force?: boolean) => Promise<void>;
  fetchCIStatus: (projectId: number, prNumber: number, force?: boolean) => Promise<void>;
  fetchAllData: (projectId: number, force?: boolean) => Promise<void>;
  
  createFixSession: (projectId: number, item: GitHubData) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  createPR: (projectId: number, title: string, body?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Utility methods
  getAllData: () => GitHubData[];
  getPRById: (id: string) => GitHubPR | undefined;
  getIssueById: (id: string) => GitHubIssue | undefined;
  getCIStatus: (prNumber: number) => GitHubCIStatus | undefined;
  
  // Cache management
  isCacheValid: (projectId: number) => boolean;
  isCIStatusCacheValid: (prNumber: number) => boolean;
  clearCache: () => void;
  clearError: () => void;
}

export const useGitHubStore = create<GitHubStore>((set, get) => ({
  // Initial state
  prs: [],
  issues: [],
  ciStatuses: {},
  isLoadingPRs: false,
  isLoadingIssues: false,
  isLoadingCIStatus: new Set(),
  isCreatingSession: null,
  error: null,
  lastFetchTime: {},
  ciStatusFetchTime: {},
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
  ciCacheTimeout: 2 * 60 * 1000, // 2 minutes
  
  // Fetch PRs
  fetchPRs: async (projectId: number, force = false) => {
    const state = get();
    
    // Check cache validity
    if (!force && state.isCacheValid(projectId) && state.prs.length > 0) {
      return;
    }
    
    set({ isLoadingPRs: true, error: null });
    
    try {
      const result = await API.github.getPRs(projectId);
      
      if (result.success && result.data) {
        set({ 
          prs: result.data,
          lastFetchTime: { ...state.lastFetchTime, [projectId]: Date.now() }
        });
      } else {
        set({ error: result.error || 'Failed to fetch pull requests' });
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch pull requests' });
    } finally {
      set({ isLoadingPRs: false });
    }
  },
  
  // Fetch Issues
  fetchIssues: async (projectId: number, force = false) => {
    const state = get();
    
    // Check cache validity
    if (!force && state.isCacheValid(projectId) && state.issues.length > 0) {
      return;
    }
    
    set({ isLoadingIssues: true, error: null });
    
    try {
      const result = await API.github.getIssues(projectId);
      
      if (result.success && result.data) {
        set({ 
          issues: result.data,
          lastFetchTime: { ...state.lastFetchTime, [projectId]: Date.now() }
        });
      } else {
        set({ error: result.error || 'Failed to fetch issues' });
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch issues' });
    } finally {
      set({ isLoadingIssues: false });
    }
  },
  
  // Fetch CI status for a specific PR
  fetchCIStatus: async (projectId: number, prNumber: number, force = false) => {
    const state = get();
    const loadingSet = new Set(state.isLoadingCIStatus);
    
    // Check cache validity first
    if (!force && state.isCIStatusCacheValid(prNumber) && state.ciStatuses[prNumber]) {
      return;
    }
    
    // Avoid duplicate requests
    if (loadingSet.has(prNumber)) {
      return;
    }
    
    loadingSet.add(prNumber);
    set({ isLoadingCIStatus: loadingSet });
    
    try {
      const result = await API.github.getCIStatus(projectId, prNumber);
      
      if (result.success && result.data) {
        set((state) => ({
          ciStatuses: {
            ...state.ciStatuses,
            [prNumber]: result.data
          },
          ciStatusFetchTime: {
            ...state.ciStatusFetchTime,
            [prNumber]: Date.now()
          }
        }));
        
        // Update PR with CI status
        set((state) => ({
          prs: state.prs.map(pr => 
            pr.number === prNumber 
              ? { ...pr, ciStatus: result.data.status }
              : pr
          )
        }));
      }
    } catch (error) {
      console.warn(`Failed to get CI status for PR #${prNumber}:`, error);
    } finally {
      const newLoadingSet = new Set(get().isLoadingCIStatus);
      newLoadingSet.delete(prNumber);
      set({ isLoadingCIStatus: newLoadingSet });
    }
  },
  
  // Fetch all data (PRs, Issues, and CI statuses)
  fetchAllData: async (projectId: number, force = false) => {
    const state = get();
    
    // Fetch PRs and Issues in parallel
    await Promise.all([
      state.fetchPRs(projectId, force),
      state.fetchIssues(projectId, force)
    ]);
    
    // Fetch CI status for all PRs
    const prs = get().prs;
    const ciPromises = prs.map(pr => state.fetchCIStatus(projectId, pr.number, force));
    await Promise.all(ciPromises);
  },
  
  // Create fix session
  createFixSession: async (projectId: number, item: GitHubData) => {
    set({ isCreatingSession: item.id, error: null });
    
    try {
      let ciLogs: string | undefined;
      
      // Get CI logs for PRs with failed CI
      if (item.type === 'pr') {
        const ciStatus = get().ciStatuses[item.number];
        if (ciStatus?.status === 'failure') {
          const logsResult = await API.github.getCILogs(projectId, item.number);
          if (logsResult.success && logsResult.data) {
            ciLogs = logsResult.data;
          }
        }
      }
      
      const result = await API.github.createFixSession({
        projectId,
        type: item.type,
        prNumber: item.type === 'pr' ? item.number : 0,
        issueNumber: item.type === 'issue' ? item.number : undefined,
        ciLogs,
        title: item.title,
        body: item.type === 'pr' ? (item as GitHubPR).body : undefined
      });
      
      if (result.success) {
        return { success: true, sessionId: result.data?.sessionId };
      } else {
        set({ error: result.error || 'Failed to create fix session' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create fix session';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      set({ isCreatingSession: null });
    }
  },
  
  // Create PR
  createPR: async (projectId: number, title: string, body?: string) => {
    set({ error: null });
    
    try {
      const result = await API.github.createPR(projectId, title, body);
      
      if (result.success) {
        // Refresh PRs to include the new one
        get().fetchPRs(projectId, true);
        return { success: true };
      } else {
        set({ error: result.error || 'Failed to create pull request' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create pull request';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },
  
  // Utility methods
  getAllData: () => {
    const state = get();
    const allData: GitHubData[] = [
      ...state.prs.map(pr => ({ ...pr, type: 'pr' as const })),
      ...state.issues.map(issue => ({ ...issue, type: 'issue' as const }))
    ];
    return allData;
  },
  
  getPRById: (id: string) => {
    return get().prs.find(pr => pr.id === id);
  },
  
  getIssueById: (id: string) => {
    return get().issues.find(issue => issue.id === id);
  },
  
  getCIStatus: (prNumber: number) => {
    return get().ciStatuses[prNumber];
  },
  
  // Cache management
  isCacheValid: (projectId: number) => {
    const state = get();
    const lastFetch = state.lastFetchTime[projectId];
    if (!lastFetch) return false;
    return Date.now() - lastFetch < state.cacheTimeout;
  },
  
  isCIStatusCacheValid: (prNumber: number) => {
    const state = get();
    const lastFetch = state.ciStatusFetchTime[prNumber];
    if (!lastFetch) return false;
    return Date.now() - lastFetch < state.ciCacheTimeout;
  },
  
  clearCache: () => {
    set({
      prs: [],
      issues: [],
      ciStatuses: {},
      lastFetchTime: {},
      ciStatusFetchTime: {},
      error: null
    });
  },
  
  clearError: () => {
    set({ error: null });
  }
}));