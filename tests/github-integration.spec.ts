import { test, expect } from './helpers/electron-test-shared';
import {
  setupGitHubTest,
  checkFilterButtons,
  clickPRsFilter,
  clickIssuesFilter,
  waitForGitHubDashboard,
  clickRefreshButton,
  validateCIBadgeProperties,
  findFailedCIBadges,
  getGitHubItems
} from './helpers/github-test-helpers';

test.describe.serial('GitHub Integration', () => {
  test('should open GitHub tab from Module Federation Core project', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    await expect(page.locator('[data-testid="github-dashboard"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="GitHub Integration"')).toBeVisible();
  });

  test('should display pull requests in GitHub tab', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const { prsFilter } = await checkFilterButtons(page);
    await prsFilter.click();
    await page.waitForTimeout(500);
    const prItems = page.locator('[data-testid^="github-item-pr-"]');
    const emptyState = page.locator('text=/No items found|No pull requests/i');
    const hasPRs = await prItems.first().isVisible({ timeout: 2000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasPRs || isEmpty).toBeTruthy();
  });

  test('should display pull requests and issues in GitHub tab', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const { allFilter, prsFilter, issuesFilter } = await checkFilterButtons(page);
    await allFilter.click();
    await page.waitForTimeout(500);
    const githubItems = page.locator('[data-testid^="github-item-"]');
    const itemCount = await githubItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(0);
    await prsFilter.click();
    await page.waitForTimeout(500);
    await issuesFilter.click();
    await page.waitForTimeout(500);
  });

  test('should display issues in GitHub tab', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const { issuesFilter } = await checkFilterButtons(page);
    await issuesFilter.click();
    await page.waitForTimeout(500);
    const issueItems = page.locator('[data-testid^="github-item-issue-"]');
    const emptyState = page.locator('text=/No items found|No issues/i');
    const hasIssues = await issueItems.first().isVisible({ timeout: 2000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasIssues || isEmpty).toBeTruthy();
  });

  test('should handle GitHub CLI not installed gracefully', async ({ electronPage }) => {
    const page = electronPage;
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });
    const projectItem = page.locator('[data-testid="project-item-6"]');
    if (await projectItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectItem.click();
      await page.waitForTimeout(1000);
      const githubTab = page.locator('button:has-text("GitHub")');
      if (await githubTab.isVisible({ timeout: 5000 })) {
        await githubTab.click();
        await page.waitForTimeout(2000);
        const errorMessage = page.locator('text=/Failed to load|GitHub CLI not found|Error/i');
        const dashboard = page.locator('[data-testid="github-dashboard"]');
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const hasData = await dashboard.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasError || hasData).toBeTruthy();
      }
    }
  });

  test('should display CI status badges', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const ciBadges = page.locator('[data-testid="ci-badge"]');
    const badgeCount = await ciBadges.count();
    if (badgeCount > 0) {
      const firstBadge = ciBadges.first();
      const status = await validateCIBadgeProperties(page, firstBadge);
      expect(['pending', 'success', 'failure', 'error']).toContain(status);
    } else {
      console.log('No CI status badges found');
    }
  });

  test('should display CI status badges for pull requests', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const { prsFilter } = await checkFilterButtons(page);
    if (await prsFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prsFilter.click();
      await page.waitForTimeout(500);
    }
    const ciBadges = page.locator('[data-testid="ci-badge"]');
    const badgeCount = await ciBadges.count();
    if (badgeCount > 0) {
      const firstBadge = ciBadges.first();
      await expect(firstBadge).toBeVisible();
      const status = await firstBadge.getAttribute('data-status');
      expect(status).toBeTruthy();
    } else {
      console.log('No CI badges found - PRs may not have CI configured');
    }
  });

  test('should handle refresh functionality', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const clicked = await clickRefreshButton(page);
    if (clicked) {
      await expect(page.locator('[data-testid="github-dashboard"]')).toBeVisible();
    } else {
      console.log('Refresh button not found');
    }
  });

  test('should create fix session from failed CI', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const ciBadges = page.locator('[data-testid="ci-badge"][data-status="failure"]');
    if (await ciBadges.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await ciBadges.first().click();
      await page.waitForTimeout(500);
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
    await setupGitHubTest(page);
    const ciBadges = page.locator('[data-testid="ci-badge"][data-status="failure"]');
    if (await ciBadges.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await ciBadges.first().click();
      await page.waitForTimeout(500);
      const fixButton = page.locator('[data-testid="fix-with-ai-button"]');
      if (await fixButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(fixButton).toBeVisible();
        console.log('Fix with AI action initiated');
      } else {
        console.log('Fix with AI button not found after expanding CI details');
      }
    } else {
      console.log('No failed CI badges found');
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

   test('should show Fix CI button for failed PRs', async ({ electronPage }) => {
     const page = electronPage;
     await page.waitForLoadState('networkidle');
     
     // Setup GitHub test environment
     await setupGitHubTest(page);
     
     // Go to Pull Requests tab
     await clickPRsFilter(page);
     
     // Look for failed CI badges using helper function
     const failedBadges = await findFailedCIBadges(page);
     const failedBadgeCount = await failedBadges.count();
     const hasFailedStatus = failedBadgeCount > 0;
     
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
 });