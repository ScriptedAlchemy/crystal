import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from '../../src/utils/commandExecutor';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn()
}));

// Mock shellPath
vi.mock('../../src/utils/shellPath', () => ({
  getShellPath: vi.fn().mockReturnValue('/usr/bin:/usr/local/bin')
}));

describe('commandExecutor', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('execSync', () => {
    it('should execute command with enhanced PATH', async () => {
      // Dynamic import to get mocked version
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = Buffer.from('test output');
      (mockExecSync as any).mockReturnValue(mockResult);

      const result = execSync('echo test');

      expect(mockExecSync).toHaveBeenCalledWith('echo test', {
        env: expect.objectContaining({
          PATH: '/usr/bin:/usr/local/bin'
        })
      });
      expect(result).toBe(mockResult);
    });

    it('should handle string encoding options', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = 'test output';
      (mockExecSync as any).mockReturnValue(mockResult);

      const result = execSync('echo test', { encoding: 'utf8' });

      expect(result).toBe(mockResult);
      expect(typeof result).toBe('string');
    });

    it('should merge custom environment variables', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = Buffer.from('test');
      (mockExecSync as any).mockReturnValue(mockResult);

      execSync('echo test', {
        env: { CUSTOM_VAR: 'value' }
      });

      expect(mockExecSync).toHaveBeenCalledWith('echo test', {
        env: expect.objectContaining({
          PATH: '/usr/bin:/usr/local/bin',
          CUSTOM_VAR: 'value'
        })
      });
    });

    it('should use custom working directory', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = Buffer.from('test');
      (mockExecSync as any).mockReturnValue(mockResult);

      execSync('ls', { cwd: '/custom/path' });

      expect(mockExecSync).toHaveBeenCalledWith('ls', expect.objectContaining({
        cwd: '/custom/path'
      }));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/custom/path'));
    });

    it('should log command execution', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = Buffer.from('test output line 1\nline 2\nline 3');
      (mockExecSync as any).mockReturnValue(mockResult);

      execSync('echo test');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Executing: echo test'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Success:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('(3 lines)'));
    });

    it('should handle execution errors', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const error = new Error('Command failed');
      (mockExecSync as any).mockImplementation(() => {
        throw error;
      });

      expect(() => execSync('bad-command')).toThrow('Command failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed: bad-command'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Command failed'));
    });

    it('should handle empty output', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = Buffer.from('');
      (mockExecSync as any).mockReturnValue(mockResult);

      const result = execSync('echo -n');

      expect(result).toBe(mockResult);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Success:'));
    });
  });

  describe('execAsync', () => {
    // Mock the promisified exec function
    const mockExecAsync = vi.fn();
    
    beforeEach(async () => {
      // Reset module cache so our mocks apply to fresh imports
      vi.resetModules();
      // Mock the util.promisify to return our mock function
      vi.doMock('util', () => ({
        promisify: vi.fn(() => mockExecAsync)
      }));
    });

    afterEach(() => {
      // Cleanup util mock and reset modules to avoid cross-test interference
      vi.unmock('util');
      vi.resetModules();
    });

    it('should execute async command with enhanced PATH', async () => {
      const mockResult = { stdout: 'async output', stderr: '' };
      mockExecAsync.mockResolvedValue(mockResult);

      // Import execAsync after mocking
      const { execAsync } = await import('../../src/utils/commandExecutor');
      const result = await execAsync('echo async test');

      expect(mockExecAsync).toHaveBeenCalledWith('echo async test', expect.objectContaining({
        env: expect.objectContaining({
          PATH: '/usr/bin:/usr/local/bin'
        }),
        timeout: 10000
      }));
      expect(result).toBe(mockResult);
    });

    it('should use custom timeout', async () => {
      const mockResult = { stdout: 'output', stderr: '' };
      mockExecAsync.mockResolvedValue(mockResult);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      await execAsync('long command', { timeout: 30000 });

      expect(mockExecAsync).toHaveBeenCalledWith('long command', expect.objectContaining({
        timeout: 30000
      }));
    });

    it('should merge custom environment variables in async execution', async () => {
      const mockResult = { stdout: 'output', stderr: '' };
      mockExecAsync.mockResolvedValue(mockResult);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      await execAsync('env command', {
        env: { ASYNC_VAR: 'async_value' }
      });

      expect(mockExecAsync).toHaveBeenCalledWith('env command', expect.objectContaining({
        env: expect.objectContaining({
          PATH: '/usr/bin:/usr/local/bin',
          ASYNC_VAR: 'async_value'
        })
      }));
    });

    it('should log async command execution', async () => {
      const mockResult = { stdout: 'async output line 1\nline 2', stderr: '' };
      mockExecAsync.mockResolvedValue(mockResult);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      await execAsync('echo async');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Executing async: echo async'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Async Success:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('(2 lines)'));
    });

    it('should handle async execution errors', async () => {
      const error = new Error('Async command failed');
      mockExecAsync.mockRejectedValue(error);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      
      await expect(execAsync('bad-async-command')).rejects.toThrow('Async command failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Async Failed: bad-async-command'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Async Error: Async command failed'));
    });

    it('should handle empty stdout in async execution', async () => {
      const mockResult = { stdout: '', stderr: 'some error output' };
      mockExecAsync.mockResolvedValue(mockResult);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      const result = await execAsync('silent command');

      expect(result).toBe(mockResult);
      // Should not log success message when stdout is empty
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Executing async: silent command'));
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Async Success:'));
    });

    it('should use custom working directory for async execution', async () => {
      const mockResult = { stdout: 'directory listing', stderr: '' };
      mockExecAsync.mockResolvedValue(mockResult);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      await execAsync('ls', { cwd: '/async/path' });

      expect(mockExecAsync).toHaveBeenCalledWith('ls', expect.objectContaining({
        cwd: '/async/path'
      }));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/async/path'));
    });

    it('should apply default 10 second timeout when not specified', async () => {
      const mockResult = { stdout: 'output', stderr: '' };
      mockExecAsync.mockResolvedValue(mockResult);

      const { execAsync } = await import('../../src/utils/commandExecutor');
      await execAsync('default timeout command');

      expect(mockExecAsync).toHaveBeenCalledWith('default timeout command', expect.objectContaining({
        timeout: 10000
      }));
    });
  });

  describe('commandExecutor singleton', () => {
    it('should export the same instance', async () => {
      const { commandExecutor } = await import('../../src/utils/commandExecutor');
      const { commandExecutor: commandExecutor2 } = await import('../../src/utils/commandExecutor');
      
      expect(commandExecutor).toBe(commandExecutor2);
    });

    it('should bind execSync method correctly', async () => {
      const { execSync: mockExecSync } = await import('child_process');
      const mockResult = Buffer.from('bound test');
      (mockExecSync as any).mockReturnValue(mockResult);

      const { execSync } = await import('../../src/utils/commandExecutor');
      
      // Verify that the exported execSync is bound to the commandExecutor instance
      const result = execSync('bound test');
      expect(result).toBe(mockResult);
    });
  });
});