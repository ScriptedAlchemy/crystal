import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatForDatabase,
  formatForDisplay,
  formatFullDateTime,
  parseTimestamp,
  getCurrentTimestamp,
  isValidTimestamp,
  toUTC,
  getTimeDifference,
  formatDuration
} from '../../src/utils/timestampUtils';

describe('timestampUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatForDatabase', () => {
    it('should format current date as ISO string', () => {
      const result = formatForDatabase();
      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should format provided date as ISO string', () => {
      const date = new Date('2024-12-25T18:30:00.000Z');
      const result = formatForDatabase(date);
      expect(result).toBe('2024-12-25T18:30:00.000Z');
    });
  });

  describe('formatForDisplay', () => {
    it('should format timestamp string for display', () => {
      const timestamp = '2024-01-01T12:00:00.000Z';
      const result = formatForDisplay(timestamp);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should format Date object for display', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const result = formatForDisplay(date);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('formatFullDateTime', () => {
    it('should format timestamp with full date and time', () => {
      const timestamp = '2024-01-01T12:00:00.000Z';
      const result = formatFullDateTime(timestamp);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should format Date object with full date and time', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const result = formatFullDateTime(date);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('parseTimestamp', () => {
    it('should parse ISO timestamp string to Date', () => {
      const timestamp = '2024-01-01T12:00:00.000Z';
      const result = parseTimestamp(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(timestamp);
    });

    it('should parse SQLite timestamp format', () => {
      const timestamp = '2024-01-01 12:00:00';
      const result = parseTimestamp(timestamp);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return current timestamp in ISO format', () => {
      const result = getCurrentTimestamp();
      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid timestamp string', () => {
      expect(isValidTimestamp('2024-01-01T12:00:00.000Z')).toBe(true);
    });

    it('should return true for valid Date object', () => {
      expect(isValidTimestamp(new Date())).toBe(true);
    });

    it('should return false for invalid timestamp', () => {
      expect(isValidTimestamp('invalid-date')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidTimestamp(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidTimestamp(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidTimestamp('')).toBe(false);
    });
  });

  describe('toUTC', () => {
    it('should convert timestamp string to UTC ISO string', () => {
      const timestamp = '2024-01-01T12:00:00.000Z';
      const result = toUTC(timestamp);
      expect(result).toBe(timestamp);
    });

    it('should convert Date object to UTC ISO string', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const result = toUTC(date);
      expect(result).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  describe('getTimeDifference', () => {
    it('should calculate difference between two timestamps', () => {
      const start = '2024-01-01T12:00:00.000Z';
      const end = '2024-01-01T12:05:30.000Z';
      const result = getTimeDifference(start, end);
      expect(result).toBe(330000); // 5 minutes 30 seconds in ms
    });

    it('should use current time as end if not provided', () => {
      const start = '2024-01-01T11:00:00.000Z';
      const result = getTimeDifference(start);
      expect(result).toBe(3600000); // 1 hour in ms
    });

    it('should handle Date objects', () => {
      const start = new Date('2024-01-01T12:00:00.000Z');
      const end = new Date('2024-01-01T12:01:00.000Z');
      const result = getTimeDifference(start, end);
      expect(result).toBe(60000); // 1 minute in ms
    });

    it('should return negative value for reversed times', () => {
      const start = '2024-01-01T12:05:00.000Z';
      const end = '2024-01-01T12:00:00.000Z';
      const result = getTimeDifference(start, end);
      expect(result).toBe(-300000); // -5 minutes in ms
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(59999)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(3599999)).toBe('59m 59s');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(7265000)).toBe('2h 1m');
      expect(formatDuration(86399999)).toBe('23h 59m');
    });

    it('should format days and hours', () => {
      expect(formatDuration(86400000)).toBe('1d 0h');
      expect(formatDuration(90000000)).toBe('1d 1h');
      expect(formatDuration(259200000)).toBe('3d 0h');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle negative duration', () => {
      expect(formatDuration(-5000)).toBe('-5s');
    });
  });
});