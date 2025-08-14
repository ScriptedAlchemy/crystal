#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// In CI environment, skip restoration since it's not needed
// The CI runs in a fresh environment each time
if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  console.log('Skipping package.json restoration in CI environment');
  process.exit(0);
}

// Restore the original package.json version from git
try {
  // First, discard any uncommitted changes to package.json
  // Use --force to ensure it doesn't prompt for input
  execSync('git checkout HEAD -- package.json', { 
    stdio: 'inherit',
    // Add timeout to prevent hanging
    timeout: 5000
  });
  console.log('Restored original package.json version');
} catch (err) {
  console.error('Failed to restore package.json:', err.message);
  // In CI, don't fail the build over this
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    console.log('Continuing despite restore failure in CI');
    process.exit(0);
  }
  process.exit(1);
}