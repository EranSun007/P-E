// src/utils/__tests__/calendarService.dateValidation.test.js
// Tests for improved CalendarService date validation logic

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService, ValidationError } from '../calendarService.js';

describe('CalendarService - Date Validation Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now to have consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('_validateDateTime', () => {
    it('should validate valid future dates', () => {
      const futureDate = '2024-01-15T11:00:00.000Z'; // 1 hour in the future
      const result = CalendarService._validateDateTime(futureDate);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(futureDate);
    });

    it('should allow dates within the buffer time', () => {
      const nearCurrentDate = '2024-01-15T09:58:00.000Z'; // 2 minutes ago (within 5 minute buffer)
      const result = CalendarService._validateDateTime(nearCurrentDate);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(nearCurrentDate);
    });

    it('should reject dates outside the buffer time with detailed error message', () => {
      const pastDate = '2024-01-15T09:50:00.000Z'; // 10 minutes ago (outside 5 minute buffer)
      
      expect(() => {
        CalendarService._validateDateTime(pastDate);
      }).toThrow(ValidationError);

      try {
        CalendarService._validateDateTime(pastDate);
      } catch (error) {
        expect(error.message).toContain('cannot be in the past');
        expect(error.message).toContain(pastDate);
        expect(error.message).toContain('2024-01-15T10:00:00.000Z'); // current time
        expect(error.message).toContain('10 minutes ago');
      }
    });

    it('should use custom buffer time', () => {
      const dateWithinCustomBuffer = '2024-01-15T09:50:00.000Z'; // 10 minutes ago
      
      // Should fail with 5 minute buffer (default)
      expect(() => {
        CalendarService._validateDateTime(dateWithinCustomBuffer, 'dateTime', false, 5);
      }).toThrow(ValidationError);

      // Should pass with 15 minute buffer
      const result = CalendarService._validateDateTime(dateWithinCustomBuffer, 'dateTime', false, 15);
      expect(result).toBeInstanceOf(Date);
    });

    it('should enforce minimum 1 minute buffer even if smaller value provided', () => {
      const dateJustPast = '2024-01-15T09:58:30.000Z'; // 1.5 minutes ago
      
      // Even with 0 buffer, should use minimum 1 minute buffer
      expect(() => {
        CalendarService._validateDateTime(dateJustPast, 'dateTime', false, 0);
      }).toThrow(ValidationError);
    });

    it('should allow past dates when allowPast is true', () => {
      const pastDate = '2024-01-15T08:00:00.000Z'; // 2 hours ago
      const result = CalendarService._validateDateTime(pastDate, 'dateTime', true);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(pastDate);
    });

    it('should reject dates more than 2 years in the future with detailed error message', () => {
      const farFutureDate = '2027-01-15T10:00:00.000Z'; // More than 2 years in the future
      
      expect(() => {
        CalendarService._validateDateTime(farFutureDate);
      }).toThrow(ValidationError);

      try {
        CalendarService._validateDateTime(farFutureDate);
      } catch (error) {
        expect(error.message).toContain('cannot be more than 2 years in the future');
        expect(error.message).toContain(farFutureDate);
        expect(error.message).toContain('2026-01-15T10:00:00.000Z'); // 2 years from now
      }
    });

    it('should provide detailed error message for invalid date format', () => {
      const invalidDate = 'not-a-date';
      
      expect(() => {
        CalendarService._validateDateTime(invalidDate);
      }).toThrow(ValidationError);

      try {
        CalendarService._validateDateTime(invalidDate);
      } catch (error) {
        expect(error.message).toContain('Invalid dateTime format');
        expect(error.message).toContain('Expected ISO string');
        expect(error.message).toContain(invalidDate);
      }
    });

    it('should handle custom field names in error messages', () => {
      const invalidDate = 'invalid';
      
      try {
        CalendarService._validateDateTime(invalidDate, 'meetingStartTime');
      } catch (error) {
        expect(error.message).toContain('Invalid meetingStartTime format');
        expect(error.field).toBe('meetingStartTime');
      }
    });

    it('should require dateTime parameter', () => {
      expect(() => {
        CalendarService._validateDateTime(null);
      }).toThrow('dateTime is required');

      expect(() => {
        CalendarService._validateDateTime(undefined);
      }).toThrow('dateTime is required');

      expect(() => {
        CalendarService._validateDateTime('');
      }).toThrow('dateTime is required');
    });

    it('should require string type for dateTime', () => {
      expect(() => {
        CalendarService._validateDateTime(123);
      }).toThrow('dateTime must be a string');

      expect(() => {
        CalendarService._validateDateTime(new Date());
      }).toThrow('dateTime must be a string');
    });

    it('should handle timezone differences correctly', () => {
      // Test with different timezone formats
      const utcDate = '2024-01-15T15:00:00.000Z';
      const offsetDate = '2024-01-15T16:00:00+01:00'; // Same time as UTC, different format
      
      const utcResult = CalendarService._validateDateTime(utcDate);
      const offsetResult = CalendarService._validateDateTime(offsetDate);
      
      expect(utcResult).toBeInstanceOf(Date);
      expect(offsetResult).toBeInstanceOf(Date);
      // Both should represent the same moment in time
      expect(utcResult.getTime()).toBe(offsetResult.getTime());
    });

    it('should handle edge case dates correctly', () => {
      // Test leap year date
      const leapYearDate = '2024-02-29T10:00:00.000Z';
      const result = CalendarService._validateDateTime(leapYearDate);
      expect(result).toBeInstanceOf(Date);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(29);

      // Test end of year
      const endOfYear = '2024-12-31T23:59:59.999Z';
      const endResult = CalendarService._validateDateTime(endOfYear);
      expect(endResult).toBeInstanceOf(Date);
    });
  });
});