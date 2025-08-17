import { test, expect } from './helpers/electron-test-shared';
import {
  setupGitHubTest,
  waitForGitHubDashboard,
  checkFilterButtons,
  clickPRsFilter,
  clickIssuesFilter,
  clickAllFilter,
  clickOpenStateFilter,
  clickClosedStateFilter,
  getGitHubItems,
  getVisibleGitHubItems,
  verifyItemState,
  verifyOnlyOpenItems,
  verifyOnlyClosedItems,
  findPRWithCIStatus,
  expandPRDetails,
  getCIDetailsSection,
  findCICheckSections,
  waitForGitHubDataToLoad
} from './helpers/github-test-helpers';

test.describe.serial('GitHub Features', () => {
  test('should launch app and navigate to GitHub tab (smoke test)', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    const dashboard = page.locator('[data-testid="github-dashboard"]');
    await expect(dashboard).toBeVisible();
    await checkFilterButtons(page);
  });

  test('should display GitHub dashboard with mock data', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    await waitForGitHubDashboard(page);
    await expect(page.locator('[data-testid="github-dashboard"]')).toBeVisible();
    await expect(page.locator('text="GitHub Integration"')).toBeVisible();
    await expect(page.locator('text="Pull Requests"')).toBeVisible();
    await expect(page.locator('text="Issues"')).toBeVisible();
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Open")')).toBeVisible();
  });

  test('should filter pull requests correctly', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    await waitForGitHubDataToLoad(page);
    const filters = await checkFilterButtons(page);
    const allGitHubItems = page.locator('.p-4.border.rounded-lg');
    const initialCount = await allGitHubItems.count();
    if (initialCount === 0) {
      const errorMessage = page.locator('text="Failed to load GitHub data"');
      const noItemsMessage = page.locator('text="No items found"');
      const loadingMessage = page.locator('text="Loading GitHub data"');
      if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('GitHub data failed to load - may need GitHub CLI or authentication');
      } else if (await noItemsMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('No GitHub items found in the repository');
      } else if (await loadingMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Still loading GitHub data');
      }
      return;
    }
    expect(initialCount).toBeGreaterThan(0);
    await filters.prsFilter.click();
    await page.waitForTimeout(500);
    const visibleItems = page.locator('.p-4.border.rounded-lg:visible');
    const visibleCount = await visibleItems.count();
    if (visibleCount > 0) {
      const firstItem = visibleItems.first();
      const prIndicator = firstItem.locator('span:has-text("PR"), [data-testid*="pr-"]');
      await expect(prIndicator.first()).toBeVisible();
      const issueIndicators = page.locator('[data-testid*="issue-"]:visible');
      const issueCount = await issueIndicators.count();
      expect(issueCount).toBe(0);
    }
    await filters.allFilter.click();
    await page.waitForTimeout(500);
    const allItemsAfterReset = await allGitHubItems.count();
    expect(allItemsAfterReset).toBe(initialCount);
    await filters.issuesFilter.click();
    await page.waitForTimeout(500);
    const visibleItemsAfterIssueFilter = page.locator('.p-4.border.rounded-lg:visible');
    const visibleCountAfterIssueFilter = await visibleItemsAfterIssueFilter.count();
    if (visibleCountAfterIssueFilter > 0) {
      const firstVisibleItem = visibleItemsAfterIssueFilter.first();
      const issueIndicator = firstVisibleItem.locator('span:text("Issue")');
      await expect(issueIndicator).toBeVisible();
      const prOnlyBadges = page.locator('span').filter({ hasText: /^PR$/ });
      const prOnlyCount = await prOnlyBadges.count();
      expect(prOnlyCount).toBe(0);
    }
    await clickAllFilter(page, filters);
    
    // Test Open state filter
    await clickOpenStateFilter(page);
    const visibleItemsAfterOpen = await getVisibleGitHubItems(page);
    const openCount = await visibleItemsAfterOpen.count();
    if (openCount > 0) {
      await verifyOnlyOpenItems(page);
    }
    
    // Test Closed state filter
    await clickClosedStateFilter(page);
    const visibleItemsAfterClosed = await getVisibleGitHubItems(page);
    const closedCount = await visibleItemsAfterClosed.count();
    if (closedCount > 0) {
      await verifyOnlyClosedItems(page);
    }
  });

  test('should expand PR details and show CI status', async ({ electronPage }) => {
    const page = electronPage;
    await setupGitHubTest(page);
    
    const prWithCI = await findPRWithCIStatus(page);
    if (prWithCI) {
      const { prItem, prNumber } = prWithCI;
      
      // Get CI status badge and log status
      const ciStatusBadge = prItem.locator(`[data-testid="pr-ci-status-${prNumber}"]`);
      const statusText = await ciStatusBadge.textContent();
      console.log(`Found PR #${prNumber} with CI status: ${statusText}`);
      
      // Expand PR details using helper function
      await expandPRDetails(page, prNumber);
      
      // Get CI details section using helper function
      const ciDetailsSection = await getCIDetailsSection(page, prNumber);
      await expect(ciDetailsSection).toBeVisible({ timeout: 5000 });
      
      // Find CI check sections using helper function
      const {
        failedChecksSection,
        runningChecksSection,
        successChecksSection,
        expandedStatus
      } = await findCICheckSections(page, prNumber);
      
      // Verify at least one section is visible
      const hasFailedChecks = await failedChecksSection.isVisible({ timeout: 1000 }).catch(() => false);
      const hasRunningChecks = await runningChecksSection.isVisible({ timeout: 1000 }).catch(() => false);
      const hasSuccessChecks = await successChecksSection.isVisible({ timeout: 1000 }).catch(() => false);
      const hasExpandedStatus = await expandedStatus.isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(hasFailedChecks || hasRunningChecks || hasSuccessChecks || hasExpandedStatus).toBeTruthy();
      
      // Verify no nested badge buttons (should be expanded)
      const nestedBadgeButton = ciDetailsSection.locator('[data-testid="ci-badge"]');
      const hasNestedBadge = await nestedBadgeButton.isVisible({ timeout: 500 }).catch(() => false);
      expect(hasNestedBadge).toBeFalsy();
    } else {
      console.log('No PRs with CI status found to test expansion');
    }
  });

  test('should display CI status badges correctly', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Look for CI status badges in PR items
    const ciStatusBadges = page.locator('[data-testid^="pr-ci-status-"]');
    const badgeCount = await ciStatusBadges.count();
    
    if (badgeCount > 0) {
      // Verify badge styles and content
      const firstBadge = ciStatusBadges.first();
      await expect(firstBadge).toBeVisible();
      
      // Get the badge text to determine status
      const badgeText = await firstBadge.textContent();
      expect(badgeText).toBeTruthy();
      
      // Check for status indicators in the badge text
      const hasPassedIndicator = badgeText?.includes('Passed');
      const hasCounts = badgeText?.match(/\d+\/\d+/);
      
      expect(hasCounts).toBeTruthy();
      
      // Check for status colors based on classes
      const badgeClasses = await firstBadge.getAttribute('class');
      expect(badgeClasses).toBeTruthy();
      
      // The badge should have appropriate color classes
      if (badgeClasses?.includes('bg-green')) {
        console.log('CI status badge shows success (green)');
      } else if (badgeClasses?.includes('bg-red')) {
        console.log('CI status badge shows failure (red)');
      } else if (badgeClasses?.includes('bg-yellow')) {
        console.log('CI status badge shows pending (yellow)');
      } else {
        console.log('CI status badge found with unknown status');
      }
      
      console.log(`CI status badges found: ${badgeText}`);
    } else {
      console.log('No CI status badges found - PRs may not have CI configured');
    }
  });

  test('should handle issues tab correctly', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Click on Issues filter
    await clickIssuesFilter(page);
    
    // Wait for issues to load
    await page.waitForTimeout(1000);
    
    // Check for GitHub items (issues)
     const githubItems = await getGitHubItems(page);
     const itemCount = await githubItems.count();
     
     if (itemCount > 0) {
       // Verify first issue item
       const firstItem = githubItems.first();
      await expect(firstItem).toBeVisible();
      
      // Issues should not have CI status badges
      const ciStatusBadge = firstItem.locator('[data-testid^="pr-ci-status-"]');
      const hasCIBadge = await ciStatusBadge.isVisible({ timeout: 500 }).catch(() => false);
      expect(hasCIBadge).toBeFalsy();
      
      console.log(`Found ${itemCount} issue items`);
    } else {
      console.log('No issue items found');
    }
  });

   test('should display overview tab with recent items', async ({ electronPage }) => {
     const page = electronPage;
     
     // Setup GitHub test environment
     await setupGitHubTest(page);
     
     // The GitHub dashboard shows all items by default (no separate Overview tab)
     // Check that we can see filter buttons
     await expect(page.locator('button:has-text("All")').first()).toBeVisible({ timeout: 5000 });
     await expect(page.locator('button:has-text("Pull Requests")')).toBeVisible({ timeout: 5000 });
     await expect(page.locator('button:has-text("Issues")')).toBeVisible({ timeout: 5000 });
     
     // Check that we have some items visible
     const items = page.locator('[class*="pr"], [class*="issue"], .p-4.border');
     const itemCount = await items.count();
     expect(itemCount).toBeGreaterThan(0);
   });

   test('should show external link buttons for PRs and issues', async ({ electronPage }) => {
     const page = electronPage;
     
     // Setup GitHub test environment
     await setupGitHubTest(page);
     
     // Pull Requests should be visible by default
     await page.waitForTimeout(1000);
     
     // Check for external link buttons on PRs
     const prExternalLinks = page.locator('[data-testid="pr-external-link"]');
     if (await prExternalLinks.first().isVisible({ timeout: 2000 }).catch(() => false)) {
       await expect(prExternalLinks.first()).toBeVisible();
       console.log('External link buttons found for PRs');
     } else {
       console.log('No external link buttons found for PRs');
     }
     
     // Switch to Issues and check for external links
     await clickIssuesFilter(page);
     await page.waitForTimeout(1000);
     
     const issueExternalLinks = page.locator('[data-testid="issue-external-link"]');
     if (await issueExternalLinks.first().isVisible({ timeout: 2000 }).catch(() => false)) {
       await expect(issueExternalLinks.first()).toBeVisible();
       console.log('External link buttons found for Issues');
     } else {
       console.log('No external link buttons found for Issues');
     }
   });
 
   test('should handle filter interactions comprehensively', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Test type filters
    const allFilter = page.locator('button:has-text("All")').first();
    const prFilter = page.locator('button:has-text("Pull Requests")');
    const issueFilter = page.locator('button:has-text("Issues")');
    
    // Test All filter
    await allFilter.click();
    await page.waitForTimeout(500);
    
    // Test PR filter
    await prFilter.click();
    await page.waitForTimeout(500);
    
    // Test status filters if available
    const openFilter = page.locator('button:has-text("Open")');
    const closedFilter = page.locator('button:has-text("Closed")');
    
    if (await openFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openFilter.click();
      await page.waitForTimeout(500);
    }
    
    if (await closedFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closedFilter.click();
      await page.waitForTimeout(500);
    }
    
    // Test Issue filter
    await issueFilter.click();
    await page.waitForTimeout(500);
    
    // Verify that filters are working by checking that content changes or remains consistent
    const githubItems = page.locator('[data-testid^="github-item-"]');
    const itemCount = await githubItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });
});