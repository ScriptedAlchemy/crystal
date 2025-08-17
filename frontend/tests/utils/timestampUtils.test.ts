import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatForDisplay,
  formatFullDateTime,
  formatDistanceToNow,
  parseTimestamp,
  isValidTimestamp,
  getTimeDifference,
  formatDuration,
  formatForSorting
} from '../../src/utils/timestampUtils';

describe('timestampUtils', () => {
  beforeEach(() => {
    // Mock Date.now to return a consistent timestamp for tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15 12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatForDisplay', () => {
    test('should format Date object', () => {
      const date = new Date('2024-01-15 12:30:45Z');
      const result = formatForDisplay(date);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Should match time format
    });

    test('should format string timestamp', () => {
      const timestamp = '2024-01-15T12:30:45Z';
      const result = formatForDisplay(timestamp);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    test('should handle SQLite format timestamps', () => {
      const timestamp = '2024-01-15 12:30:45';
      const result = formatForDisplay(timestamp);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('formatFullDateTime', () => {
    test('should format Date object with date and time', () => {
      const date = new Date('2024-01-15 12:30:45Z');
      const result = formatFullDateTime(date);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}.*\d{1,2}:\d{2}:\d{2}/); // Should include both date and time
    });

    test('should format string timestamp with date and time', () => {
      const timestamp = '2024-01-15T12:30:45Z';
      const result = formatFullDateTime(timestamp);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}.*\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('formatDistanceToNow', () => {
    test('should return "just now" for recent timestamps', () => {
      const recent = new Date('2024-01-15 12:00:30Z'); // 30 seconds ago
      const result = formatDistanceToNow(recent);
      expect(result).toBe('just now');
    });

    test('should return minutes for timestamps within an hour', () => {
      const tenMinutesAgo = new Date('2024-01-15 11:50:00Z');
      const result = formatDistanceToNow(tenMinutesAgo);
      expect(result).toBe('10 minutes ago');
    });

    test('should return single minute without plural', () => {
      const oneMinuteAgo = new Date('2024-01-15 11:59:00Z');
      const result = formatDistanceToNow(oneMinuteAgo);
      expect(result).toBe('1 minute ago');
    });

    test('should return hours for timestamps within a day', () => {
      const twoHoursAgo = new Date('2024-01-15 10:00:00Z');
      const result = formatDistanceToNow(twoHoursAgo);
      expect(result).toBe('2 hours ago');
    });

    test('should return single hour without plural', () => {
      const oneHourAgo = new Date('2024-01-15 11:00:00Z');
      const result = formatDistanceToNow(oneHourAgo);
      expect(result).toBe('1 hour ago');
    });

    test('should return days for timestamps older than a day', () => {
      const threeDaysAgo = new Date('2024-01-12 12:00:00Z');
      const result = formatDistanceToNow(threeDaysAgo);
      expect(result).toBe('3 days ago');
    });

    test('should return single day without plural', () => {
      const oneDayAgo = new Date('2024-01-14 12:00:00Z');
      const result = formatDistanceToNow(oneDayAgo);
      expect(result).toBe('1 day ago');
    });

    test('should handle string timestamps', () => {
      const timestamp = '2024-01-15T11:30:00Z';
      const result = formatDistanceToNow(timestamp);
      expect(result).toBe('30 minutes ago');
    });
  });

  describe('parseTimestamp', () => {
    test('should return Date object unchanged', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = parseTimestamp(date);
      expect(result).toBe(date);
    });

    test('should parse SQLite DATETIME format as UTC', () => {
      const sqliteTimestamp = '2024-01-15 12:00:00';
      const result = parseTimestamp(sqliteTimestamp);
      expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should parse SQLite DATETIME with milliseconds', () => {
      const sqliteTimestamp = '2024-01-15 12:00:00.123';
      const result = parseTimestamp(sqliteTimestamp);
      expect(result.toISOString()).toBe('2024-01-15T12:00:00.123Z');
    });

    test('should parse ISO 8601 format normally', () => {
      const isoTimestamp = '2024-01-15T12:00:00.000Z';
      const result = parseTimestamp(isoTimestamp);
      expect(result.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should parse other date formats normally', () => {
      const dateString = '2024-01-15';
      const result = parseTimestamp(dateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      // Use UTC date to avoid timezone issues
      expect(result.getUTCDate()).toBe(15);
    });
  });

  describe('isValidTimestamp', () => {
    test('should return true for valid Date objects', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(isValidTimestamp(date)).toBe(true);
    });

    test('should return true for valid string timestamps', () => {
      expect(isValidTimestamp('2024-01-15T12:00:00Z')).toBe(true);
      expect(isValidTimestamp('2024-01-15 12:00:00')).toBe(true);
      expect(isValidTimestamp('2024-01-15')).toBe(true);
    });

    test('should return false for invalid timestamps', () => {
      expect(isValidTimestamp('invalid-date')).toBe(false);
      expect(isValidTimestamp('2024-13-45T25:70:90Z')).toBe(false);
    });

    test('should return false for null and undefined', () => {
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isValidTimestamp('')).toBe(false);
    });

    test('should return false for invalid Date objects', () => {
      const invalidDate = new Date('invalid');
      expect(isValidTimestamp(invalidDate)).toBe(false);
    });
  });

  describe('getTimeDifference', () => {
    test('should calculate difference between two dates', () => {
      const start = new Date('2024-01-15 11:00:00Z');
      const end = new Date('2024-01-15 12:00:00Z');
      const diff = getTimeDifference(start, end);
      expect(diff).toBe(60 * 60 * 1000); // 1 hour in milliseconds
    });

    test('should calculate difference from start to current time when end not provided', () => {
      const start = new Date('2024-01-15 11:00:00Z');
      const diff = getTimeDifference(start);
      expect(diff).toBe(60 * 60 * 1000); // 1 hour in milliseconds (current time is 12:00:00Z)
    });

    test('should handle string timestamps', () => {
      const start = '2024-01-15T11:00:00Z';
      const end = '2024-01-15T11:30:00Z';
      const diff = getTimeDifference(start, end);
      expect(diff).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });

    test('should handle SQLite format timestamps', () => {
      const start = '2024-01-15 11:00:00';
      const end = '2024-01-15 11:15:00';
      const diff = getTimeDifference(start, end);
      expect(diff).toBe(15 * 60 * 1000); // 15 minutes in milliseconds
    });

    test('should return negative difference for end before start', () => {
      const start = new Date('2024-01-15 12:00:00Z');
      const end = new Date('2024-01-15 11:00:00Z');
      const diff = getTimeDifference(start, end);
      expect(diff).toBe(-60 * 60 * 1000); // -1 hour in milliseconds
    });
  });

  describe('formatDuration', () => {
    test('should format seconds', () => {
      const ms = 5000; // 5 seconds
      expect(formatDuration(ms)).toBe('5s');
    });

    test('should format minutes and seconds', () => {
      const ms = 125000; // 2 minutes 5 seconds
      expect(formatDuration(ms)).toBe('2m 5s');
    });

    test('should format hours and minutes', () => {
      const ms = 3665000; // 1 hour 1 minute 5 seconds
      expect(formatDuration(ms)).toBe('1h 1m');
    });

    test('should format days and hours', () => {
      const ms = 90061000; // 1 day 1 hour 1 minute 1 second
      expect(formatDuration(ms)).toBe('1d 1h');
    });

    test('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    test('should handle fractional seconds', () => {
      const ms = 1500; // 1.5 seconds
      expect(formatDuration(ms)).toBe('1s');
    });

    test('should handle large durations', () => {
      const ms = 259200000; // 3 days 0 hours exactly
      expect(formatDuration(ms)).toBe('3d 0h');
    });

    test('should handle exact hour boundaries', () => {
      const ms = 3600000; // Exactly 1 hour
      expect(formatDuration(ms)).toBe('1h 0m');
    });

    test('should handle exact day boundaries', () => {
      const ms = 86400000; // Exactly 1 day
      expect(formatDuration(ms)).toBe('1d 0h');
    });
  });

  describe('formatForSorting', () => {
    test('should format Date object to ISO string', () => {
      const date = new Date('2024-01-15T12:00:00.000Z');
      const result = formatForSorting(date);
      expect(result).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should format string timestamp to ISO string', () => {
      const timestamp = '2024-01-15 12:00:00';
      const result = formatForSorting(timestamp);
      // Use parseTimestamp to handle SQLite UTC conversion properly
      const parsed = parseTimestamp(timestamp);
      expect(result).toBe(parsed.toISOString());
    });

    test('should handle ISO string input', () => {
      const timestamp = '2024-01-15T12:00:00.000Z';
      const result = formatForSorting(timestamp);
      expect(result).toBe('2024-01-15T12:00:00.000Z');
    });

    test('should maintain consistent format for sorting', () => {
      const dates = [
        '2024-01-15 11:00:00',
        '2024-01-15T12:00:00Z',
        new Date('2024-01-15T13:00:00Z')
      ];
      
      const formatted = dates.map(formatForSorting);
      
      // All should be valid ISO strings
      formatted.forEach(f => {
        expect(f).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
      
      // Should be in chronological order when sorted
      const sorted = [...formatted].sort();
      expect(sorted).toEqual(formatted);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle timezone boundaries correctly', () => {
      // Test around daylight saving time transition
      const springForward = '2024-03-10 07:00:00'; // UTC time during DST transition
      const parsed = parseTimestamp(springForward);
      expect(parsed.toISOString()).toBe('2024-03-10T07:00:00.000Z');
    });

    test('should handle leap year dates', () => {
      const leapDay = '2024-02-29 12:00:00';
      const parsed = parseTimestamp(leapDay);
      expect(parsed.toISOString()).toBe('2024-02-29T12:00:00.000Z');
    });

    test('should handle year boundaries', () => {
      const newYear = '2024-01-01 00:00:00';
      const parsed = parseTimestamp(newYear);
      expect(parsed.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    test('should maintain precision for milliseconds', () => {
      const preciseTime = '2024-01-15 12:00:00.123';
      const parsed = parseTimestamp(preciseTime);
      expect(parsed.getMilliseconds()).toBe(123);
    });
  });
});