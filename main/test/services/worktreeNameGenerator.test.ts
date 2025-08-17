import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorktreeNameGenerator } from '../../src/services/worktreeNameGenerator';
import { ConfigManager } from '../../src/services/configManager';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

vi.mock('@anthropic-ai/sdk');
vi.mock('fs/promises');
vi.mock('../../src/services/configManager');

describe('WorktreeNameGenerator', () => {
  let generator: WorktreeNameGenerator;
  let mockConfigManager: ConfigManager;
  let mockAnthropicClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfigManager = {
      getAnthropicApiKey: vi.fn().mockReturnValue('test-api-key'),
      getGitRepoPath: vi.fn().mockReturnValue('/test/repo'),
      on: vi.fn(),
      emit: vi.fn(),
      removeListener: vi.fn()
    } as any;

    mockAnthropicClient = {
      messages: {
        create: vi.fn()
      }
    };

    (Anthropic as any).mockImplementation(() => mockAnthropicClient);
    
    generator = new WorktreeNameGenerator(mockConfigManager);
  });

  describe('constructor', () => {
    it('should initialize Anthropic client when API key is available', () => {
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should not initialize Anthropic client when API key is missing', () => {
      vi.clearAllMocks();
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      
      new WorktreeNameGenerator(mockConfigManager);
      
      expect(Anthropic).not.toHaveBeenCalled();
    });

    it('should listen for config updates', () => {
      expect(mockConfigManager.on).toHaveBeenCalledWith('config-updated', expect.any(Function));
    });
  });

  describe('generateWorktreeName', () => {
    it('should generate name using AI when Anthropic client is available', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'fix-auth-bug' }]
      });

      const result = await generator.generateWorktreeName('Fix user authentication bug');
      
      expect(result).toBe('fix-auth-bug');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        temperature: 0.3,
        messages: expect.any(Array)
      });
    });

    it('should sanitize AI-generated names', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Fix Auth Bug!!!' }]
      });

      const result = await generator.generateWorktreeName('Fix authentication');
      
      expect(result).toBe('fix-auth-bug');
    });

    it('should use fallback when AI fails', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API error'));

      const result = await generator.generateWorktreeName('Fix authentication bug in login');
      
      expect(result).toBe('fix-authentication-bug');
    });

    it('should use fallback when no Anthropic client', async () => {
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      generator = new WorktreeNameGenerator(mockConfigManager);

      const result = await generator.generateWorktreeName('Fix authentication bug');
      
      expect(result).toBe('fix-authentication-bug');
      expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
    });

    it('should handle empty AI response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      
      expect(result).toBe('fix-bug');
    });

    it('should handle non-text AI response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'other', data: 'something' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      
      expect(result).toBe('fix-bug');
    });
  });

  describe('generateFallbackName', () => {
    it('should generate name from first few words', async () => {
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      generator = new WorktreeNameGenerator(mockConfigManager);

      const result = await generator.generateWorktreeName('Update the user profile page');
      expect(result).toBe('update-the-user');
    });

    it('should filter out short words', async () => {
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      generator = new WorktreeNameGenerator(mockConfigManager);

      const result = await generator.generateWorktreeName('To do a fix of the bug');
      expect(result).toBe('fix-the-bug');
    });

    it('should handle special characters', async () => {
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      generator = new WorktreeNameGenerator(mockConfigManager);

      const result = await generator.generateWorktreeName('Fix @user\'s bug! (urgent)');
      expect(result).toBe('fix-user-bug');
    });

    it('should return default name for empty prompt', async () => {
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      generator = new WorktreeNameGenerator(mockConfigManager);

      const result = await generator.generateWorktreeName('');
      expect(result).toBe('new-task');
    });

    it('should return default name for very short prompt', async () => {
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      generator = new WorktreeNameGenerator(mockConfigManager);

      const result = await generator.generateWorktreeName('a b c');
      expect(result).toBe('new-task');
    });
  });

  describe('generateUniqueWorktreeName', () => {
    beforeEach(() => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'feature-branch' }]
      });
    });

    it('should return base name when no conflicts', async () => {
      (fs.access as any).mockRejectedValue(new Error('Not found'));

      const result = await generator.generateUniqueWorktreeName('New feature');
      
      expect(result).toBe('feature-branch');
    });

    it('should append number when name exists', async () => {
      (fs.access as any).mockResolvedValue(undefined);
      (fs.stat as any)
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockRejectedValue(new Error('Not found'));

      const result = await generator.generateUniqueWorktreeName('New feature');
      
      expect(result).toBe('feature-branch-1');
    });

    it('should increment counter for multiple conflicts', async () => {
      (fs.access as any).mockResolvedValue(undefined);
      (fs.stat as any)
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockRejectedValue(new Error('Not found'));

      const result = await generator.generateUniqueWorktreeName('New feature');
      
      expect(result).toBe('feature-branch-3');
    });

    it('should check correct worktree path', async () => {
      (fs.access as any).mockResolvedValue(undefined);
      (fs.stat as any).mockRejectedValue(new Error('Not found'));

      await generator.generateUniqueWorktreeName('New feature');
      
      expect(fs.stat).toHaveBeenCalledWith(path.join('/test/repo/worktrees', 'feature-branch'));
    });

    it('should handle stat errors as non-existent', async () => {
      (fs.access as any).mockResolvedValue(undefined);
      (fs.stat as any).mockRejectedValue(new Error('Permission denied'));

      const result = await generator.generateUniqueWorktreeName('New feature');
      
      expect(result).toBe('feature-branch');
    });
  });

  describe('sanitizeName', () => {
    it('should convert to lowercase', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Fix-AUTH-Bug' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      expect(result).toBe('fix-auth-bug');
    });

    it('should replace spaces with hyphens', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'fix auth bug' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      expect(result).toBe('fix-auth-bug');
    });

    it('should remove special characters', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'fix@auth#bug!' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      expect(result).toBe('fixauthbug');
    });

    it('should collapse multiple hyphens', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'fix---auth---bug' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      expect(result).toBe('fix-auth-bug');
    });

    it('should remove leading and trailing hyphens', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: '-fix-auth-bug-' }]
      });

      const result = await generator.generateWorktreeName('Fix bug');
      expect(result).toBe('fix-auth-bug');
    });

    it('should limit to 30 characters', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'this-is-a-very-long-worktree-name-that-exceeds-limit' }]
      });

      const result = await generator.generateWorktreeName('Long name');
      expect(result).toBe('this-is-a-very-long-worktree-n');
      expect(result.length).toBe(30);
    });
  });

  describe('config updates', () => {
    it('should reinitialize Anthropic when config is updated', () => {
      const updateHandler = (mockConfigManager.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'config-updated'
      )[1];

      vi.clearAllMocks();
      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue('new-api-key');
      
      updateHandler();
      
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'new-api-key' });
    });

    it('should clear Anthropic client when API key is removed', () => {
      const updateHandler = (mockConfigManager.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'config-updated'
      )[1];

      mockConfigManager.getAnthropicApiKey = vi.fn().mockReturnValue(null);
      
      updateHandler();
      
      expect(Anthropic).toHaveBeenCalledTimes(1); // Only initial call
    });
  });
});