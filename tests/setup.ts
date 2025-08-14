import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function setupTestProject() {
  // Create a temporary test project directory with more unique naming
  const testProjectPath = path.join(os.tmpdir(), `crystal-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  
  // Clean up if directory exists
  if (fs.existsSync(testProjectPath)) {
    fs.rmSync(testProjectPath, { recursive: true, force: true });
  }
  
  fs.mkdirSync(testProjectPath, { recursive: true });
  
  try {
    // Initialize git in the test directory
    const { execSync } = require('child_process');
    
    // Try git init without specifying branch first (for compatibility)
    try {
      execSync('git init', { cwd: testProjectPath, stdio: 'pipe' });
    } catch (error) {
      console.log('Basic git init failed, trying with branch specification');
      execSync('git init -b main', { cwd: testProjectPath, stdio: 'pipe' });
    }
    
    execSync('git config user.email "test@example.com"', { cwd: testProjectPath, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testProjectPath, stdio: 'pipe' });
    
    // Create a simple README file
    fs.writeFileSync(path.join(testProjectPath, 'README.md'), '# Test Project\n');
    
    execSync('git add .', { cwd: testProjectPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testProjectPath, stdio: 'pipe' });
    
    console.log('Test project setup completed at:', testProjectPath);
    return testProjectPath;
  } catch (error) {
    console.error('Failed to setup test project:', error);
    // Clean up on failure
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
    throw error;
  }
}

export async function cleanupTestProject(projectPath: string | undefined) {
  if (!projectPath) {
    console.warn('No project path provided for cleanup');
    return;
  }
  
  try {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
      console.log('Cleaned up test project:', projectPath);
    }
  } catch (error) {
    console.error('Failed to cleanup test project:', error);
  }
}