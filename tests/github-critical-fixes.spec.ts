import { test, expect } from './helpers/electron-test-shared';
import { Page } from 'playwright';

// Helper functions
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

test.describe.serial('GitHub Critical Fixes', () => {
  // Test Fix #1: CI status should show "Failed" when 0 checks pass
  test('should show CI status as Failed when 0 out of N checks pass', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Look for CI status badges on PRs
    const ciStatusBadges = page.locator('[data-testid^="pr-ci-status-"]');
    const badgeCount = await ciStatusBadges.count();
    
    if (badgeCount > 0) {
      // Check each badge for the "0/N" pattern
      for (let i = 0; i < badgeCount; i++) {
        const badge = ciStatusBadges.nth(i);
        const badgeText = await badge.textContent();
        
        // Check if this badge shows "0/N" checks passed
        const match = badgeText?.match(/Passed \((\d+)\/(\d+)\)/);
        if (match) {
          const passedCount = parseInt(match[1]);
          const totalCount = parseInt(match[2]);
          
          if (passedCount === 0 && totalCount > 0) {
            // When 0 checks pass, the badge should NOT say "Passed"
            // It should have failure styling (red background)
            const badgeClasses = await badge.getAttribute('class');
            
            // The badge should have red/failure styling
            expect(badgeClasses).toContain('bg-red');
            
            // The text should NOT say "Passed" when 0 checks pass
            // The logic fix ensures status is 'failure' when successCount === 0
            console.log(`Badge shows "${badgeText}" - verifying failure status`);
            
            // The badge parent should indicate failure status
            const prNumber = await badge.getAttribute('data-testid')?.then(id => id?.match(/\d+/)?.[0]);
            if (prNumber) {
              // Check the PR item has failure indication
              const prItem = page.locator(`[data-testid="github-item-pr-${prNumber}"]`);
              const failureIndicators = prItem.locator('.bg-red-100, .text-red-800');
              const hasFailureIndicator = await failureIndicators.first().isVisible({ timeout: 1000 }).catch(() => false);
              expect(hasFailureIndicator).toBeTruthy();
            }
          }
        }
      }
    } else {
      console.log('No CI status badges found - may need real GitHub data');
    }
  });

  // Test Fix #2: Expanded PR should show actual CI details, not another badge
  test('should show actual CI check details when PR is expanded', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Find PR items with CI status
    const prItems = page.locator('[data-testid^="github-item-pr-"]');
    const prCount = await prItems.count();
    
    if (prCount > 0) {
      let testedExpansion = false;
      
      for (let i = 0; i < Math.min(3, prCount); i++) {
        const prItem = prItems.nth(i);
        const prNumber = await prItem.getAttribute('data-testid')?.then(id => id?.match(/pr-(\d+)/)?.[1]);
        
        if (!prNumber) continue;
        
        // Check if this PR has CI status
        const ciStatusBadge = prItem.locator(`[data-testid="pr-ci-status-${prNumber}"]`);
        if (await ciStatusBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`Testing PR #${prNumber} expansion for CI details`);
          
          // Click the expand toggle
          const expandToggle = prItem.locator(`[data-testid="pr-expand-toggle-${prNumber}"]`);
          await expect(expandToggle).toBeVisible();
          await expandToggle.click();
          await page.waitForTimeout(1000);
          
          // Verify CI details section is visible
          const ciDetailsSection = page.locator(`[data-testid="pr-ci-details-${prNumber}"]`);
          await expect(ciDetailsSection).toBeVisible({ timeout: 5000 });
          
          // The CI details should show actual check information, NOT another badge
          // With expandedByDefault=true, it should show details directly
          
          // Look for actual CI check sections (not badges)
          const failedChecksSection = ciDetailsSection.locator('[data-testid="ci-failed-checks"]');
          const runningChecksSection = ciDetailsSection.locator('[data-testid="ci-running-checks"]');
          const successChecksSection = ciDetailsSection.locator('[data-testid="ci-success-checks"]');
          
          // At least one check section should be visible
          const hasFailedChecks = await failedChecksSection.isVisible({ timeout: 1000 }).catch(() => false);
          const hasRunningChecks = await runningChecksSection.isVisible({ timeout: 1000 }).catch(() => false);
          const hasSuccessChecks = await successChecksSection.isVisible({ timeout: 1000 }).catch(() => false);
          
          // Check if we have the expanded status section directly (when expandedByDefault=true)
          const expandedStatus = ciDetailsSection.locator('[data-testid="ci-status-expanded"]');
          const hasExpandedStatus = await expandedStatus.isVisible({ timeout: 1000 }).catch(() => false);
          
          // Also check for status summary text
          const hasStatusSummary = await ciDetailsSection.textContent().then(text => 
            text?.includes('Passed') || text?.includes('Failed') || text?.includes('Running')
          ).catch(() => false);
          
          // Should have actual check details or expanded status, not just another badge
          expect(hasFailedChecks || hasRunningChecks || hasSuccessChecks || hasExpandedStatus || hasStatusSummary).toBeTruthy();
          
          // If there are failed checks, verify individual check items are shown
          if (hasFailedChecks) {
            const checkItems = failedChecksSection.locator('[data-testid="ci-failed-check-item"]');
            const checkCount = await checkItems.count();
            expect(checkCount).toBeGreaterThan(0);
            
            // Verify check names are visible
            const checkNames = failedChecksSection.locator('[data-testid="ci-check-name"]');
            const firstCheckName = await checkNames.first().textContent();
            expect(firstCheckName).toBeTruthy();
            console.log(`Found failed check: ${firstCheckName}`);
          }
          
          // Verify there's no nested badge button (which was the bug)
          const nestedBadgeButton = ciDetailsSection.locator('[data-testid="ci-badge"]');
          const hasNestedBadge = await nestedBadgeButton.isVisible({ timeout: 500 }).catch(() => false);
          expect(hasNestedBadge).toBeFalsy(); // Should NOT have another badge inside expanded details
          
          testedExpansion = true;
          break;
        }
      }
      
      if (!testedExpansion) {
        console.log('No PRs with CI status found to test expansion');
      }
    }
  });

  // Test Fix #3: Open/Closed filters should work correctly
  test('should filter items correctly by open/closed state', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Wait for items to load
    await page.waitForTimeout(2000);
    
    // First, click "All" type filter to see all items
    const allTypeFilter = page.locator('[data-testid="filter-type-all"]');
    await allTypeFilter.click();
    await page.waitForTimeout(500);
    
    // Get all state filter buttons
    const allStateFilter = page.locator('[data-testid="filter-state-all"]');
    const openStateFilter = page.locator('[data-testid="filter-state-open"]');
    const closedStateFilter = page.locator('[data-testid="filter-state-closed"]');
    
    // Test "All" state filter - should show all items regardless of state
    await allStateFilter.click();
    await page.waitForTimeout(500);
    
    const allItems = page.locator('[data-testid^="github-item-"]');
    const totalItemCount = await allItems.count();
    console.log(`Total items with "All" state filter: ${totalItemCount}`);
    
    if (totalItemCount > 0) {
      // Test "Open" state filter
      await openStateFilter.click();
      await page.waitForTimeout(500);
      
      // Count visible items after filtering
      const openItems = page.locator('[data-testid^="github-item-"]:visible');
      const openItemCount = await openItems.count();
      console.log(`Items with "Open" state filter: ${openItemCount}`);
      
      // Verify each visible item has open state
      if (openItemCount > 0) {
        for (let i = 0; i < Math.min(3, openItemCount); i++) {
          const item = openItems.nth(i);
          
          // Check for state badge with "open" text
          const stateBadge = item.locator('[data-testid*="-state-"]');
          const stateText = await stateBadge.textContent();
          
          // State should be "open" (converted from uppercase "OPEN" in backend)
          expect(stateText?.toLowerCase()).toContain('open');
        }
        
        // Count closed/merged items - should be none when filter is "open"
        const allVisibleStates = await page.locator('[data-testid^="github-item-"]:visible [data-testid*="-state-"]').allTextContents();
        const nonOpenStates = allVisibleStates.filter(state => 
          !state.toLowerCase().includes('open')
        );
        expect(nonOpenStates.length).toBe(0);
      }
      
      // Test "Closed" state filter
      await closedStateFilter.click();
      await page.waitForTimeout(500);
      
      // Count visible items after filtering
      const closedItems = page.locator('[data-testid^="github-item-"]:visible');
      const closedItemCount = await closedItems.count();
      console.log(`Items with "Closed" state filter: ${closedItemCount}`);
      
      // Verify each visible item has closed or merged state
      if (closedItemCount > 0) {
        for (let i = 0; i < Math.min(3, closedItemCount); i++) {
          const item = closedItems.nth(i);
          
          // Check for state badge with "closed" or "merged" text
          const stateBadge = item.locator('[data-testid*="-state-"]');
          const stateText = await stateBadge.textContent();
          
          // State should be "closed" or "merged" (converted from uppercase in backend)
          const isClosedOrMerged = stateText?.toLowerCase().includes('closed') || 
                                   stateText?.toLowerCase().includes('merged');
          expect(isClosedOrMerged).toBeTruthy();
        }
        
        // Count open items - should be none when filter is "closed"
        const allVisibleStates = await page.locator('[data-testid^="github-item-"]:visible [data-testid*="-state-"]').allTextContents();
        const openStates = allVisibleStates.filter(state => 
          state.toLowerCase() === 'open'
        );
        expect(openStates.length).toBe(0);
      }
      
      // Verify that filters actually filter (not all items shown for each filter)
      // At least one filter should show different count than total
      const filtersWork = (openItemCount !== totalItemCount) || 
                          (closedItemCount !== totalItemCount);
      expect(filtersWork).toBeTruthy();
    } else {
      console.log('No items found - may need real GitHub data');
    }
  });

  // Additional test to verify combined type and state filtering
  test('should correctly combine type and state filters', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Wait for items to load
    await page.waitForTimeout(2000);
    
    // Test PR + Open combination
    const prsTypeFilter = page.locator('[data-testid="filter-type-prs"]');
    const openStateFilter = page.locator('[data-testid="filter-state-open"]');
    
    await prsTypeFilter.click();
    await page.waitForTimeout(500);
    await openStateFilter.click();
    await page.waitForTimeout(500);
    
    // All visible items should be open PRs
    const visibleItems = page.locator('[data-testid^="github-item-"]:visible');
    const itemCount = await visibleItems.count();
    
    if (itemCount > 0) {
      for (let i = 0; i < Math.min(2, itemCount); i++) {
        const item = visibleItems.nth(i);
        
        // Should be a PR
        const prBadge = item.locator('[data-testid="pr-type-badge"]');
        await expect(prBadge).toBeVisible();
        
        // Should be open
        const stateBadge = item.locator('[data-testid*="-state-"]');
        const stateText = await stateBadge.textContent();
        expect(stateText?.toLowerCase()).toContain('open');
      }
    }
    
    // Test Issues + Closed combination
    const issuesTypeFilter = page.locator('[data-testid="filter-type-issues"]');
    const closedStateFilter = page.locator('[data-testid="filter-state-closed"]');
    
    await issuesTypeFilter.click();
    await page.waitForTimeout(500);
    await closedStateFilter.click();
    await page.waitForTimeout(500);
    
    // All visible items should be closed issues
    const visibleIssues = page.locator('[data-testid^="github-item-"]:visible');
    const issueCount = await visibleIssues.count();
    
    if (issueCount > 0) {
      for (let i = 0; i < Math.min(2, issueCount); i++) {
        const item = visibleIssues.nth(i);
        
        // Should be an issue
        const issueBadge = item.locator('[data-testid="issue-type-badge"]');
        await expect(issueBadge).toBeVisible();
        
        // Should be closed
        const stateBadge = item.locator('[data-testid*="-state-"]');
        const stateText = await stateBadge.textContent();
        expect(stateText?.toLowerCase()).toContain('closed');
      }
    }
    
    console.log(`Found ${itemCount} open PRs and ${issueCount} closed issues`);
  });

  // Test to verify CI status text shows correct "Failed" instead of "Passed"
  test('should display correct CI status text in badge', async ({ electronPage }) => {
    const page = electronPage;
    
    // Setup GitHub test environment
    await setupGitHubTest(page);
    
    // Look for CI status badges
    const ciStatusBadges = page.locator('[data-testid^="pr-ci-status-"]');
    const badgeCount = await ciStatusBadges.count();
    
    if (badgeCount > 0) {
      for (let i = 0; i < badgeCount; i++) {
        const badge = ciStatusBadges.nth(i);
        const badgeText = await badge.textContent();
        
        // Parse the badge text for passed/total counts
        const match = badgeText?.match(/Passed \((\d+)\/(\d+)\)/);
        if (match) {
          const passedCount = parseInt(match[1]);
          const totalCount = parseInt(match[2]);
          
          console.log(`CI Badge ${i}: ${passedCount}/${totalCount} checks passed`);
          
          // Verify the text logic:
          // - If 0 checks pass out of N, it should show failure styling
          // - The fix ensures status is 'failure' when successCount === 0
          if (passedCount === 0 && totalCount > 0) {
            // Badge should have failure colors
            const badgeClasses = await badge.getAttribute('class');
            const hasFailureStyle = badgeClasses?.includes('bg-red') || 
                                   badgeClasses?.includes('text-red');
            
            expect(hasFailureStyle).toBeTruthy();
            console.log(`✓ Badge correctly shows failure style for 0/${totalCount} passed`);
          } else if (passedCount === totalCount && totalCount > 0) {
            // All checks passed - should have success styling
            const badgeClasses = await badge.getAttribute('class');
            const hasSuccessStyle = badgeClasses?.includes('bg-green') || 
                                   badgeClasses?.includes('text-green');
            
            expect(hasSuccessStyle).toBeTruthy();
            console.log(`✓ Badge correctly shows success style for ${passedCount}/${totalCount} passed`);
          } else if (passedCount > 0 && passedCount < totalCount) {
            // Partial success - should have warning/failure styling
            const badgeClasses = await badge.getAttribute('class');
            const hasWarningStyle = badgeClasses?.includes('bg-yellow') || 
                                   badgeClasses?.includes('bg-red');
            
            expect(hasWarningStyle).toBeTruthy();
            console.log(`✓ Badge correctly shows warning/failure style for ${passedCount}/${totalCount} passed`);
          }
        }
      }
    } else {
      console.log('No CI status badges found - may need PRs with CI configured');
    }
  });
});