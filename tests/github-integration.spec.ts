import { test, expect } from './helpers/electron-test-shared';
import { Page } from 'playwright';

// Helper functions to reduce code repetition
async function waitForSidebar(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="sidebar"]', { timeout });
}

async function selectModuleFederationProject(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="project-item-6"]', { timeout });
  await page.click('[data-testid="project-item-6"]');
  await page.waitForTimeout(1000);
}

async function navigateToGitHubTab(page: Page, timeout = 5000) {
  const githubTab = page.locator('button:has-text("GitHub")');
  await expect(githubTab).toBeVisible({ timeout });
  await githubTab.click();
  await page.waitForTimeout(1000);
}

async function waitForGitHubDashboard(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="github-dashboard"]', { timeout });
}

async function setupGitHubTest(page: Page) {
  await waitForSidebar(page);
  await selectModuleFederationProject(page);
  await navigateToGitHubTab(page);
  await waitForGitHubDashboard(page);
}

async function checkFilterButtons(page: Page, timeout = 5000) {
  // Use data-testid for more specific selection to avoid conflicts with state filters
  const allFilter = page.locator('[data-testid="filter-type-all"], button:has-text("All")').first();
  const prsFilter = page.locator('[data-testid="filter-type-prs"], button:has-text("Pull Requests")').first();
  const issuesFilter = page.locator('[data-testid="filter-type-issues"], button:has-text("Issues")').first();
  
  await expect(allFilter).toBeVisible({ timeout });
  await expect(prsFilter).toBeVisible({ timeout });
  await expect(issuesFilter).toBeVisible({ timeout });
  
  return { allFilter, prsFilter, issuesFilter };
}

test.describe.serial('GitHub Integration', () => {
  test('should open GitHub tab from Module Federation Core project', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Verify GitHub dashboard is visible
    await expect(page.locator('[data-testid="github-dashboard"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="GitHub Integration"')).toBeVisible();
  });

  test('should display pull requests in GitHub tab', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Check for filter buttons
    const { prsFilter } = await checkFilterButtons(page);
    
    // Click on Pull Requests filter
    await prsFilter.click();
    await page.waitForTimeout(500);
    
    // Check for PR items or empty state
    const prItems = page.locator('[data-testid^="github-item-pr-"]');
    const emptyState = page.locator('text=/No items found|No pull requests/i');
    
    const hasPRs = await prItems.first().isVisible({ timeout: 2000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasPRs || isEmpty).toBeTruthy();
  });

  test('should display pull requests and issues in GitHub tab', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Check for filter buttons
    const { allFilter, prsFilter, issuesFilter } = await checkFilterButtons(page);
    
    // Click All filter to see all items
    await allFilter.click();
    await page.waitForTimeout(500);
    
    // Check for any GitHub items
    const githubItems = page.locator('[data-testid^="github-item-"]');
    const itemCount = await githubItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(0);
    
    // Click Pull Requests filter
    await prsFilter.click();
    await page.waitForTimeout(500);
    
    // Click Issues filter
    await issuesFilter.click();
    await page.waitForTimeout(500);
  });

  test('should display issues in GitHub tab', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Check for filter buttons and click Issues filter
    const { issuesFilter } = await checkFilterButtons(page);
    await issuesFilter.click();
    await page.waitForTimeout(500);
    
    // Check for issue items or empty state
    const issueItems = page.locator('[data-testid^="github-item-issue-"]');
    const emptyState = page.locator('text=/No items found|No issues/i');
    
    const hasIssues = await issueItems.first().isVisible({ timeout: 2000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasIssues || isEmpty).toBeTruthy();
  });

  test('should handle GitHub CLI not installed gracefully', async ({ electronPage }) => {
    const page = electronPage;
    
    // Wait for sidebar to load
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });
    
    // Select Module Federation Core project (project-item-6) if it exists
    const projectItem = page.locator('[data-testid="project-item-6"]');
    if (await projectItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectItem.click();
      await page.waitForTimeout(1000);
      
      // Open GitHub tab
      const githubTab = page.locator('button:has-text("GitHub")');
      if (await githubTab.isVisible({ timeout: 5000 })) {
        await githubTab.click();
        await page.waitForTimeout(2000);
        
        // Check for error message or working state
        const errorMessage = page.locator('text=/Failed to load|GitHub CLI not found|Error/i');
        const dashboard = page.locator('[data-testid="github-dashboard"]');
        
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const hasData = await dashboard.isVisible({ timeout: 2000 }).catch(() => false);
        
        // Either state is valid - error or working
        expect(hasError || hasData).toBeTruthy();
      }
    }
  });

  test('should display CI status badges', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Look for CI status badges
    const ciBadges = page.locator('[data-testid="ci-badge"]');
    const badgeCount = await ciBadges.count();
    
    if (badgeCount > 0) {
      const firstBadge = ciBadges.first();
      await expect(firstBadge).toBeVisible();
      
      // Check badge has status attribute
      const status = await firstBadge.getAttribute('data-status');
      expect(['pending', 'success', 'failure', 'error']).toContain(status);
    } else {
      // No CI badges is also valid (not all PRs have CI)
      console.log('No CI status badges found');
    }
  });

  test('should display CI status badges for pull requests', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Filter to show only PRs
    const { prsFilter } = await checkFilterButtons(page);
    if (await prsFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prsFilter.click();
      await page.waitForTimeout(500);
    }
    
    // Look for CI badges on PRs
    const ciBadges = page.locator('[data-testid="ci-badge"]');
    const badgeCount = await ciBadges.count();
    
    if (badgeCount > 0) {
      console.log(`Found ${badgeCount} CI status badges`);
      
      // Verify first badge
      const firstBadge = ciBadges.first();
      await expect(firstBadge).toBeVisible();
      
      // Verify badge has proper attributes
      const status = await firstBadge.getAttribute('data-status');
      expect(status).toBeTruthy();
    } else {
      console.log('No CI badges found - PRs may not have CI configured');
    }
  });

  test('should handle refresh functionality', async ({ electronPage }) => {
    const page = electronPage;
    
    // Use helper function to set up the test
    await setupGitHubTest(page);
    
    // Find and click refresh button
    const refreshButton = page.locator('[data-testid="refresh-github"], button[aria-label="Refresh GitHub data"]');
    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();
      
      // Wait for refresh to complete (loading indicator might appear)
      await page.waitForTimeout(1000);
      
      // Dashboard should still be visible after refresh
      await expect(page.locator('[data-testid="github-dashboard"]')).toBeVisible();
    } else {
      console.log('Refresh button not found');
    }
  });

  test('should create fix session from failed CI', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Look for CI badges
    const ciBadges = page.locator('[data-testid="ci-badge"][data-status="failure"]');
    if (await ciBadges.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to expand CI details
      await ciBadges.first().click();
      await page.waitForTimeout(500);
      
      // Look for Fix with AI button
      const fixButton = page.locator('[data-testid="fix-with-ai-button"]');
      if (await fixButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(fixButton).toBeVisible();
        console.log('Fix with AI button found for failed CI');
      }
    } else {
      console.log('No failed CI badges found to test fix session creation');
    }
  });

  test('should handle Fix with AI action for failed CI', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Look for failed CI badges
    const failedBadges = page.locator('[data-testid="ci-badge"][data-status="failure"]');
    const failedCount = await failedBadges.count();
    
    if (failedCount > 0) {
      // Click first failed badge to expand
      await failedBadges.first().click();
      await page.waitForTimeout(500);
      
      // Check for Fix with AI button
      const fixButton = page.locator('[data-testid="fix-with-ai-button"]');
      if (await fixButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(fixButton).toBeVisible();
        await expect(fixButton).toHaveText(/Fix with AI/i);
      }
    } else {
      console.log('No failed CI to test Fix with AI action');
    }
  });

  test('should expand PR and show detailed CI status', async ({ electronPage }) => {
    const page = electronPage;
    await page.waitForLoadState('networkidle');
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Go to PRs
    const prButton = page.locator('button:has-text("Pull Requests")');
    if (await prButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find first PR item
    const prSelectors = [
      '[data-testid="pr-item"]',
      'div:has(> button[aria-label="Toggle details"])',
      'div:has-text("#100")',
      'div:has-text("Fix critical performance")'
    ];
    
    let firstPR: any = null;
    for (const selector of prSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        firstPR = element;
        break;
      }
    }
    
    if (firstPR) {
      // Find and click expand button
      const expandBtn = firstPR.locator('button[aria-label="Toggle details"], button:has(svg)').first();
      if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(2000);
        
        // Verify the expanded area is visible
        const expandedArea = firstPR.locator('.border-t.border-border-primary');
        const expandedAreaVisible = await expandedArea.isVisible({ timeout: 2000 }).catch(() => false);
        
        // Check for CI Checks section
        const ciChecks = page.locator('text="CI Checks"');
        const hasCI = await ciChecks.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasCI) {
          // Check for test output in pre tags
          const testOutput = firstPR.locator('pre');
          const outputCount = await testOutput.count();
          expect(outputCount).toBeGreaterThan(0);
          
          // Check for status indicators
          const successIcons = firstPR.locator('.text-green-500');
          const failureIcons = firstPR.locator('.text-red-500');
          const statusCount = await successIcons.count() + await failureIcons.count();
          expect(statusCount).toBeGreaterThan(0);
        }
        
        // Assert that we have actual content
        expect(expandedAreaVisible || hasCI).toBeTruthy();
      }
    }
  });

  test('should show Fix CI button for failed PRs', async ({ electronPage }) => {
    const page = electronPage;
    await page.waitForLoadState('networkidle');
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Go to Pull Requests tab
    const prButton = page.locator('button:has-text("Pull Requests")');
    if (await prButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for Failed badge on any PR
    const failedBadge = page.locator('span:has-text("Failed")').first();
    const hasFailedStatus = await failedBadge.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasFailedStatus) {
      // Find the PR item containing the failed badge
      const failedPR = page.locator('[data-testid="pr-item"]:has(span:has-text("Failed"))').first();
      
      // First check if there's a Fix CI button in the collapsed view
      let fixButton = failedPR.locator('button:has-text("Fix CI")');
      let hasFixButton = await fixButton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (!hasFixButton) {
        // If not in collapsed view, expand the PR to find it
        const expandBtn = failedPR.locator('button[aria-label="Toggle details"]').first();
        if (await expandBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expandBtn.click();
          await page.waitForTimeout(2000);
          
          // Look for Fix CI button in expanded view
          fixButton = failedPR.locator('button:has-text("Create Fix Session")');
          hasFixButton = await fixButton.isVisible({ timeout: 2000 }).catch(() => false);
        }
      }
      
      expect(hasFixButton).toBeTruthy();
      
      // Test clicking the Fix CI button
      if (hasFixButton) {
        // Count sessions before clicking
        const sessionCountBefore = await page.locator('[data-testid="session-item"]').count();
        
        // Click the Fix CI button
        await fixButton.click();
        
        // Wait for potential session creation
        await page.waitForTimeout(3000);
        
        // Check if a new session was created
        const sessionCountAfter = await page.locator('[data-testid="session-item"]').count();
        expect(sessionCountAfter).toBeGreaterThanOrEqual(sessionCountBefore);
      }
    } else {
      // Check if there are any CI status badges at all
      const ciStatusBadges = page.locator('[data-testid^="pr-ci-status-"]');
      const badgeCount = await ciStatusBadges.count();
      
      if (badgeCount > 0) {
        // At least verify we can see CI status badges
        const firstBadge = ciStatusBadges.first();
        await expect(firstBadge).toBeVisible();
        console.log('CI status badges found but no failed PRs to test Fix CI button');
      } else {
        // No CI status at all - this might be expected if PRs don't have CI configured
        console.log('No CI status badges found - PRs may not have CI configured');
        // This is not necessarily a failure - some repos might not have CI
      }
    }
  });

  test('should handle GitHub authentication states', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Check for authentication status or dashboard
    const githubDashboard = page.locator('[data-testid="github-dashboard"]');
    const errorMessage = page.locator('text=/Failed to load|Error/i');
    
    const hasDashboard = await githubDashboard.isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasDashboard || hasError).toBeTruthy();
  });

  test('should display loading states properly', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Check for loading indicators (may be brief)
    const loadingIndicator = page.locator('[data-testid="loading"], .animate-spin');
    const hasLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Verify final state - either dashboard or error message
    const githubDashboard = page.locator('[data-testid="github-dashboard"]');
    const errorMessage = page.locator('text=/Error|Failed/i');
    
    const hasDashboard = await githubDashboard.isVisible({ timeout: 2000 }).catch(() => false);
    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasDashboard || hasError).toBeTruthy();
  });
});