import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCrystalDirectory, setCrystalDirectory, getCrystalSubdirectory } from '../../src/utils/crystalDirectory';
import { homedir } from 'os';
import { join } from 'path';

vi.mock('os', () => ({
  homedir: vi.fn()
}));

describe('crystalDirectory', () => {
  const originalEnv = process.env;
  const mockHomeDir = '/home/testuser';

  beforeEach(() => {
    vi.clearAllMocks();
    (homedir as any).mockReturnValue(mockHomeDir);
    
    // Reset process.env
    process.env = { ...originalEnv };
    delete process.env.CRYSTAL_DIR;
    
    // Reset the module state by clearing the custom directory
    setCrystalDirectory(undefined as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getCrystalDirectory', () => {
    it('should return custom directory when set', () => {
      const customDir = '/custom/crystal/dir';
      setCrystalDirectory(customDir);
      
      const result = getCrystalDirectory();
      
      expect(result).toBe(customDir);
      expect(homedir).not.toHaveBeenCalled();
    });

    it('should return environment variable when no custom directory is set', () => {
      const envDir = '/env/crystal/dir';
      process.env.CRYSTAL_DIR = envDir;
      
      const result = getCrystalDirectory();
      
      expect(result).toBe(envDir);
      expect(homedir).not.toHaveBeenCalled();
    });

    it('should return default directory when no custom directory or env variable', () => {
      const result = getCrystalDirectory();
      
      expect(result).toBe(join(mockHomeDir, '.crystal'));
      expect(homedir).toHaveBeenCalled();
    });

    it('should prioritize custom directory over environment variable', () => {
      const customDir = '/custom/crystal/dir';
      const envDir = '/env/crystal/dir';
      
      process.env.CRYSTAL_DIR = envDir;
      setCrystalDirectory(customDir);
      
      const result = getCrystalDirectory();
      
      expect(result).toBe(customDir);
    });

    it('should handle empty string custom directory', () => {
      setCrystalDirectory('');
      process.env.CRYSTAL_DIR = '/env/dir';
      
      const result = getCrystalDirectory();
      
      // Empty string is falsy, so it should fall back to env
      expect(result).toBe('/env/dir');
    });
  });

  describe('setCrystalDirectory', () => {
    it('should set custom directory', () => {
      const customDir = '/my/custom/dir';
      
      setCrystalDirectory(customDir);
      
      expect(getCrystalDirectory()).toBe(customDir);
    });

    it('should allow resetting custom directory', () => {
      setCrystalDirectory('/first/dir');
      setCrystalDirectory('/second/dir');
      
      expect(getCrystalDirectory()).toBe('/second/dir');
    });

    it('should handle undefined to reset', () => {
      setCrystalDirectory('/some/dir');
      setCrystalDirectory(undefined as any);
      
      const result = getCrystalDirectory();
      
      expect(result).toBe(join(mockHomeDir, '.crystal'));
    });
  });

  describe('getCrystalSubdirectory', () => {
    it('should return subdirectory path', () => {
      setCrystalDirectory('/crystal');
      
      const result = getCrystalSubdirectory('sessions', 'data');
      
      expect(result).toBe(join('/crystal', 'sessions', 'data'));
    });

    it('should handle single subdirectory', () => {
      setCrystalDirectory('/crystal');
      
      const result = getCrystalSubdirectory('logs');
      
      expect(result).toBe(join('/crystal', 'logs'));
    });

    it('should handle no subdirectories', () => {
      setCrystalDirectory('/crystal');
      
      const result = getCrystalSubdirectory();
      
      expect(result).toBe('/crystal');
    });

    it('should work with environment variable', () => {
      process.env.CRYSTAL_DIR = '/env/crystal';
      
      const result = getCrystalSubdirectory('config', 'settings.json');
      
      expect(result).toBe(join('/env/crystal', 'config', 'settings.json'));
    });

    it('should work with default directory', () => {
      const result = getCrystalSubdirectory('database', 'crystal.db');
      
      expect(result).toBe(join(mockHomeDir, '.crystal', 'database', 'crystal.db'));
    });

    it('should handle paths with slashes', () => {
      setCrystalDirectory('/crystal');
      
      const result = getCrystalSubdirectory('sessions/active', 'data.json');
      
      // join normalizes the paths
      expect(result).toBe(join('/crystal', 'sessions/active', 'data.json'));
    });
  });

  describe('cross-platform compatibility', () => {
    it('should use path.join for cross-platform paths', () => {
      setCrystalDirectory('/crystal');
      
      const result = getCrystalSubdirectory('sub', 'dir');
      
      // The result should use the platform's path separator
      expect(result).toBe(join('/crystal', 'sub', 'dir'));
    });
  });
});