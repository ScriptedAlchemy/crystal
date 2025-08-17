import { expect } from './electron-test-shared';
import { Page } from 'playwright';

// Helper functions for GitHub test navigation and setup
export async function waitForSidebar(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="sidebar"]', { timeout });
}

export async function selectModuleFederationProject(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="project-item-6"]', { timeout });
  await page.click('[data-testid="project-item-6"]');
  await page.waitForTimeout(1000);
}

export async function navigateToGitHubTab(page: Page, timeout = 5000) {
  const githubTab = page.locator('button:has-text("GitHub")');
  await expect(githubTab).toBeVisible({ timeout });
  await githubTab.click();
  await page.waitForTimeout(1000);
}

export async function waitForGitHubDashboard(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="github-dashboard"]', { timeout });
}

export async function setupGitHubTest(page: Page) {
  await waitForSidebar(page);
  await selectModuleFederationProject(page);
  await navigateToGitHubTab(page);
  await waitForGitHubDashboard(page);
}

// Helper functions for GitHub filter interactions
export interface FilterButtons {
  allFilter: any;
  prsFilter: any;
  issuesFilter: any;
}

export async function checkFilterButtons(page: Page, timeout = 5000): Promise<FilterButtons> {
  // Use data-testid for more specific selection to avoid conflicts with state filters
  const allFilter = page.locator('[data-testid="filter-type-all"], button:has-text("All")').first();
  const prsFilter = page.locator('[data-testid="filter-type-prs"], button:has-text("Pull Requests")').first();
  const issuesFilter = page.locator('[data-testid="filter-type-issues"], button:has-text("Issues")').first();
  
  await expect(allFilter).toBeVisible({ timeout });
  await expect(prsFilter).toBeVisible({ timeout });
  await expect(issuesFilter).toBeVisible({ timeout });
  
  return { allFilter, prsFilter, issuesFilter };
}

export async function clickAllFilter(page: Page, filterButtons?: FilterButtons) {
  const filters = filterButtons || await checkFilterButtons(page);
  await filters.allFilter.click();
  await page.waitForTimeout(500);
}

export async function clickPRsFilter(page: Page, filterButtons?: FilterButtons) {
  const filters = filterButtons || await checkFilterButtons(page);
  await filters.prsFilter.click();
  await page.waitForTimeout(500);
}

export async function clickIssuesFilter(page: Page, filterButtons?: FilterButtons) {
  const filters = filterButtons || await checkFilterButtons(page);
  await filters.issuesFilter.click();
  await page.waitForTimeout(500);
}

// Helper functions for state filter interactions
export async function getStateFilters(page: Page) {
  const allStateFilter = page.locator('[data-testid="filter-state-all"]');
  const openStateFilter = page.locator('[data-testid="filter-state-open"]');
  const closedStateFilter = page.locator('[data-testid="filter-state-closed"]');
  
  return { allStateFilter, openStateFilter, closedStateFilter };
}

export async function clickOpenStateFilter(page: Page) {
  const { openStateFilter } = await getStateFilters(page);
  await openStateFilter.click();
  await page.waitForTimeout(500);
}

export async function clickClosedStateFilter(page: Page) {
  const { closedStateFilter } = await getStateFilters(page);
  await closedStateFilter.click();
  await page.waitForTimeout(500);
}

export async function clickAllStateFilter(page: Page) {
  const { allStateFilter } = await getStateFilters(page);
  await allStateFilter.click();
  await page.waitForTimeout(500);
}

// Helper functions for CI status interactions
export async function findCIStatusBadges(page: Page) {
  return page.locator('[data-testid^="pr-ci-status-"]');
}

export async function findFailedCIBadges(page: Page) {
  return page.locator('[data-testid="ci-badge"][data-status="failure"]');
}

export async function expandPRDetails(page: Page, prNumber: string) {
  const expandToggle = page.locator(`[data-testid="pr-expand-toggle-${prNumber}"]`);
  await expect(expandToggle).toBeVisible();
  await expandToggle.click();
  await page.waitForTimeout(1000);
}

export async function getCIDetailsSection(page: Page, prNumber: string) {
  return page.locator(`[data-testid="pr-ci-details-${prNumber}"]`);
}

export async function findCICheckSections(page: Page, prNumber: string) {
  const ciDetailsSection = await getCIDetailsSection(page, prNumber);
  
  const failedChecksSection = ciDetailsSection.locator('[data-testid="ci-failed-checks"]');
  const runningChecksSection = ciDetailsSection.locator('[data-testid="ci-running-checks"]');
  const successChecksSection = ciDetailsSection.locator('[data-testid="ci-success-checks"]');
  const expandedStatus = ciDetailsSection.locator('[data-testid="ci-status-expanded"]');
  
  return {
    ciDetailsSection,
    failedChecksSection,
    runningChecksSection,
    successChecksSection,
    expandedStatus
  };
}

// Helper functions for GitHub item interactions
export async function getGitHubItems(page: Page, type?: 'pr' | 'issue') {
  if (type === 'pr') {
    return page.locator('[data-testid^="github-item-pr-"]');
  } else if (type === 'issue') {
    return page.locator('[data-testid^="github-item-issue-"]');
  }
  return page.locator('[data-testid^="github-item-"]');
}

export async function getVisibleGitHubItems(page: Page) {
  return page.locator('[data-testid^="github-item-"]:visible');
}

export async function findPRWithCIStatus(page: Page): Promise<{ prItem: any; prNumber: string } | null> {
  const prItems = await getGitHubItems(page, 'pr');
  const prCount = await prItems.count();
  
  for (let i = 0; i < Math.min(3, prCount); i++) {
    const prItem = prItems.nth(i);
    const prNumber = await prItem.getAttribute('data-testid')?.then(id => id?.match(/pr-(\d+)/)?.[1]);
    
    if (!prNumber) continue;
    
    const ciStatusBadge = prItem.locator(`[data-testid="pr-ci-status-${prNumber}"]`);
    if (await ciStatusBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
      return { prItem, prNumber };
    }
  }
  
  return null;
}

// Helper functions for state verification
export async function verifyItemState(page: Page, item: any, expectedState: 'open' | 'closed' | 'merged') {
  const stateBadge = item.locator('[data-testid*="-state-"]');
  const stateText = await stateBadge.textContent();
  
  if (expectedState === 'open') {
    expect(stateText?.toLowerCase()).toContain('open');
  } else if (expectedState === 'closed') {
    const isClosedOrMerged = stateText?.toLowerCase().includes('closed') || 
                           stateText?.toLowerCase().includes('merged');
    expect(isClosedOrMerged).toBeTruthy();
  } else if (expectedState === 'merged') {
    expect(stateText?.toLowerCase()).toContain('merged');
  }
}

export async function verifyOnlyOpenItems(page: Page) {
  const allVisibleItems = await getVisibleGitHubItems(page);
  const itemCount = await allVisibleItems.count();
  
  for (let i = 0; i < Math.min(5, itemCount); i++) {
    const item = allVisibleItems.nth(i);
    await verifyItemState(page, item, 'open');
  }
}

export async function verifyOnlyClosedItems(page: Page) {
  const allVisibleItems = await getVisibleGitHubItems(page);
  const itemCount = await allVisibleItems.count();
  
  for (let i = 0; i < Math.min(5, itemCount); i++) {
    const item = allVisibleItems.nth(i);
    await verifyItemState(page, item, 'closed');
  }
}

// Helper functions for empty state and error handling
export async function checkForEmptyState(page: Page, type?: 'prs' | 'issues') {
  const emptyStateMessages = [
    'text=/No items found/',
    'text=/No pull requests/i',
    'text=/No issues/i'
  ];
  
  for (const selector of emptyStateMessages) {
    const element = page.locator(selector);
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      return true;
    }
  }
  
  return false;
}

export async function checkForGitHubErrors(page: Page) {
  const errorSelectors = [
    'text=/Failed to load|GitHub CLI not found|Error/i',
    'text="Failed to load GitHub data"',
    'text="Loading GitHub data"'
  ];
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
      return await element.textContent();
    }
  }
  
  return null;
}

// Helper functions for refresh functionality
export async function clickRefreshButton(page: Page) {
  const refreshButton = page.locator('[data-testid="refresh-github"], button[aria-label="Refresh GitHub data"]');
  if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await refreshButton.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

// Helper functions for Fix with AI interactions
export async function findFixWithAIButton(page: Page) {
  return page.locator('[data-testid="fix-with-ai-button"]');
}

export async function clickFixWithAIButton(page: Page) {
  const fixButton = await findFixWithAIButton(page);
  if (await fixButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fixButton.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

// Helper function for CI status validation
export async function validateCIBadgeProperties(page: Page, badge: any) {
  // Check badge has status attribute
  const status = await badge.getAttribute('data-status');
  expect(['pending', 'success', 'failure', 'error']).toContain(status);
  
  // Verify badge is visible
  await expect(badge).toBeVisible();
  
  return status;
}

// Helper function to wait for data to load
export async function waitForGitHubDataToLoad(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="github-items-list"]', { timeout });
  await page.waitForTimeout(2000); // Give time for data to fully load
}

// Helper function for counting items with validation
export async function countAndValidateItems(page: Page, expectedMinimum = 0) {
  const items = await getGitHubItems(page);
  const count = await items.count();
  
  if (count === 0) {
    const errorMessage = await checkForGitHubErrors(page);
    if (errorMessage) {
      console.log(`GitHub data load issue: ${errorMessage}`);
    }
    
    const isEmpty = await checkForEmptyState(page);
    if (isEmpty) {
      console.log('No GitHub items found in the repository');
    }
  } else {
    expect(count).toBeGreaterThanOrEqual(expectedMinimum);
  }
  
  return count;
}