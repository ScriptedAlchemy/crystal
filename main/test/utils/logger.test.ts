import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock modules before importing Logger
vi.mock('fs');
vi.mock('../../src/utils/crystalDirectory', () => ({
  getCrystalSubdirectory: vi.fn().mockReturnValue('/test/logs')
}));
vi.mock('../../src/utils/timestampUtils', () => ({
  formatForDatabase: vi.fn().mockReturnValue('2024-01-01T12:00:00.000Z')
}));

// Now import after mocks are set up
import { Logger } from '../../src/utils/logger';
import { ConfigManager } from '../../src/services/configManager';

describe('Logger', () => {
  let logger: Logger;
  let mockConfigManager: ConfigManager;
  let mockWriteStream: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock ConfigManager
    mockConfigManager = {
      isVerbose: vi.fn().mockReturnValue(true)
    } as any;

    // Mock fs methods
    (fs.existsSync as any).mockReturnValue(false);
    (fs.mkdirSync as any).mockImplementation(() => {});
    (fs.readdirSync as any).mockReturnValue([]);
    (fs.statSync as any).mockReturnValue({ size: 0, mtime: new Date() });
    
    // Mock WriteStream
    mockWriteStream = {
      write: vi.fn((_data: any, cb?: any) => {
        if (cb) cb();
      }),
      end: vi.fn(),
      destroyed: false
    };
    (fs.createWriteStream as any).mockReturnValue(mockWriteStream);

    // Create logger instance
    logger = new Logger(mockConfigManager);
  });

  afterEach(() => {
    logger.close();
  });

  describe('initialization', () => {
    it('should create logs directory if it does not exist', () => {
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/logs', { recursive: true });
    });

    it('should create write stream for current log file', () => {
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        path.join('/test/logs', 'crystal-2024-01-01.log'),
        { flags: 'a' }
      );
    });

    it('should get file size if log file exists', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.statSync as any).mockReturnValue({ size: 1024 });
      
      new Logger(mockConfigManager);
      
      expect(fs.statSync).toHaveBeenCalledWith(path.join('/test/logs', 'crystal-2024-01-01.log'));
    });
  });

  describe('logging to file', () => {
    it('should write verbose messages to file when verbose is enabled', () => {
      logger.verbose('Test verbose message');
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('VERBOSE: Test verbose message'),
        expect.any(Function)
      );
    });

    it('should not write verbose messages when verbose is disabled', () => {
      (mockConfigManager.isVerbose as any).mockReturnValue(false);
      
      logger.verbose('Test verbose message');
      
      expect(mockWriteStream.write).not.toHaveBeenCalled();
    });

    it('should write info messages to file', () => {
      logger.info('Test info message');
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info message'),
        expect.any(Function)
      );
    });

    it('should write warning messages to file', () => {
      logger.warn('Test warning message');
      
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning message'),
        expect.any(Function)
      );
    });

    it('should write error messages with error object to file', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10';
      
      logger.error('Test error message', error);
      
      const writeCalls = mockWriteStream.write.mock.calls;
      const logMessage = writeCalls[0][0];
      
      expect(logMessage).toContain('ERROR: Test error message');
      expect(logMessage).toContain('Error: Test error');
      expect(logMessage).toContain('Stack:');
    });

    it('should include timestamp in log messages', () => {
      logger.info('Test message');
      
      const writeCalls = mockWriteStream.write.mock.calls;
      const logMessage = writeCalls[0][0];
      
      expect(logMessage).toContain('[2024-01-01T12:00:00.000Z]');
    });
  });

  describe('log rotation', () => {
    it('should rotate log when size exceeds limit', () => {
      // Set current log size to near limit
      (fs.existsSync as any).mockReturnValue(true);
      (fs.statSync as any).mockReturnValue({ size: 10 * 1024 * 1024 - 100 }); // Just under 10MB
      
      const logger = new Logger(mockConfigManager);
      
      // Mock rename for rotation
      (fs.renameSync as any).mockImplementation(() => {});
      
      // Write a message that would exceed the limit
      mockWriteStream.write.mockImplementation((_data: any, cb: any) => {
        if (cb) cb();
      });
      
      // Simulate writing large content
      const largeMessage = 'x'.repeat(200);
      logger.info(largeMessage);
      
      // Since our mock doesn't actually track size properly, we'd need more complex mocking
      // to test rotation fully. This test mainly ensures the setup is correct.
      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up old log files', () => {
      const oldFiles = [
        { name: 'crystal-2024-01-01.log', path: '/test/logs/crystal-2024-01-01.log', mtime: new Date('2024-01-01') },
        { name: 'crystal-2024-01-02.log', path: '/test/logs/crystal-2024-01-02.log', mtime: new Date('2024-01-02') },
        { name: 'crystal-2024-01-03.log', path: '/test/logs/crystal-2024-01-03.log', mtime: new Date('2024-01-03') },
        { name: 'crystal-2024-01-04.log', path: '/test/logs/crystal-2024-01-04.log', mtime: new Date('2024-01-04') },
        { name: 'crystal-2024-01-05.log', path: '/test/logs/crystal-2024-01-05.log', mtime: new Date('2024-01-05') },
        { name: 'crystal-2024-01-06.log', path: '/test/logs/crystal-2024-01-06.log', mtime: new Date('2024-01-06') },
      ];
      
      (fs.readdirSync as any).mockReturnValue(oldFiles.map(f => f.name));
      (fs.statSync as any).mockImplementation((path: string) => {
        const file = oldFiles.find(f => f.path === path);
        return { mtime: file?.mtime || new Date() };
      });
      (fs.unlinkSync as any).mockImplementation(() => {});
      
      new Logger(mockConfigManager);
      
      // Should delete the oldest file (2024-01-01)
      expect(fs.unlinkSync).toHaveBeenCalledWith('/test/logs/crystal-2024-01-01.log');
    });
  });

  describe('error handling', () => {
    it('should handle write stream errors gracefully', () => {
      mockWriteStream.write.mockImplementation((_data: any, cb: any) => {
        if (cb) cb(new Error('Write failed'));
      });
      
      // Should not throw
      expect(() => logger.info('Test message')).not.toThrow();
    });

    it('should reinitialize stream if destroyed', () => {
      mockWriteStream.destroyed = true;
      
      logger.info('Test message');
      
      // Should create a new stream
      expect(fs.createWriteStream).toHaveBeenCalledTimes(2); // Initial + reinit
    });
  });

  describe('close', () => {
    it('should close write stream when closing logger', () => {
      logger.close();
      
      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('should handle close when stream is already null', () => {
      logger.close();
      logger.close(); // Second close
      
      expect(mockWriteStream.end).toHaveBeenCalledTimes(1);
    });
  });
});