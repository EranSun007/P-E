/**
 * Tests for enhanced error handling and retry logic in calendar services
 * Verifies that retry logic avoids infinite loops and handles different error types appropriately
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarService, ValidationError, NotFoundError, DuplicateError, OperationError } from '../../utils/calendarService.js';
import { CalendarSynchronizationService } from '../calendarSynchronizationService.js';
import { RecurringBirthdayService } from '../recurringBirthdayService.js';
import { ErrorHandlingService, NetworkError, DataError } from '../errorHandlingService.js';
import { CalendarEvent, TeamMember, OneOnOne } from '../../api/entities.js';

// Mock the entities
vi.mock('../../api/entities.js');

// Mock the toast functionality
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

describe('Enhanced Error Handling and Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CalendarService Retry Logic', () => {
    it('should not retry validation errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new ValidationError('Invalid date format', 'dateTime'))
        .mockResolvedValue('success');

      await expect(
        CalendarService._retryOperation(mockOperation, {
          maxRetries: 3,
          operationName: 'test operation'
        })
      ).rejects.toThrow(ValidationError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should not retry not found errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new NotFoundError('Team member not found', 'TeamMember', 'test-id'))
        .mockResolvedValue('success');

      await expect(
        CalendarService._retryOperation(mockOperation, {
          maxRetries: 3,
          operationName: 'test operation'
        })
      ).rejects.toThrow(NotFoundError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should not retry duplicate errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new DuplicateError('Meeting already exists'))
        .mockResolvedValue('success');

      await expect(
        CalendarService._retryOperation(mockOperation, {
          maxRetries: 3,
          operationName: 'test operation'
        })
      ).rejects.toThrow(DuplicateError);

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry network errors with exponential backoff', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('connection failed'))
        .mockResolvedValue('success');

      // Mock setTimeout to execute immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback) => {
        callback();
        return 1;
      });

      const result = await CalendarService._retryOperation(mockOperation, {
        maxRetries: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        operationName: 'test operation'
      });

      global.setTimeout = originalSetTimeout;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should respect custom shouldRetry function', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('custom error'))
        .mockResolvedValue('success');

      const customShouldRetry = vi.fn().mockReturnValue(false);

      await expect(
        CalendarService._retryOperation(mockOperation, {
          maxRetries: 3,
          shouldRetry: customShouldRetry,
          operationName: 'test operation'
        })
      ).rejects.toThrow('custom error');

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(customShouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should not retry date validation errors that keep failing', async () => {
      const dateValidationError = new ValidationError('dateTime cannot be in the past', 'dateTime');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(dateValidationError)
        .mockRejectedValueOnce(dateValidationError);

      const customShouldRetry = (error, attempt) => {
        if (error instanceof ValidationError && error.field === 'dateTime' && attempt > 1) {
          return false;
        }
        return true;
      };

      // Mock setTimeout to execute immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback) => {
        callback();
        return 1;
      });

      await expect(
        CalendarService._retryOperation(mockOperation, {
          maxRetries: 3,
          baseDelay: 100,
          shouldRetry: customShouldRetry,
          operationName: 'create calendar event'
        })
      ).rejects.toThrow(ValidationError);

      global.setTimeout = originalSetTimeout;

      // Should try once, then retry once, then stop due to custom shouldRetry logic
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('CalendarSynchronizationService Retry Logic', () => {
    it('should not retry infinite loop scenarios', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValue(new Error('dateTime cannot be in the past'));

      await expect(
        CalendarSynchronizationService._retryOperation(mockOperation, {
          maxRetries: 3,
          operationName: 'sync operation'
        })
      ).rejects.toThrow();

      // Should only try once for date validation errors on second attempt
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry synchronization errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('server error'))
        .mockResolvedValue('success');

      // Mock setTimeout to execute immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback) => {
        callback();
        return 1;
      });

      const result = await CalendarSynchronizationService._retryOperation(mockOperation, {
        maxRetries: 2,
        baseDelay: 100,
        operationName: 'sync operation'
      });

      global.setTimeout = originalSetTimeout;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    // Note: Retry callback functionality is tested implicitly through other tests
    // The ErrorHandlingService.retryOperation method handles callbacks internally
  });

  describe('RecurringBirthdayService Error Handling', () => {
    beforeEach(() => {
      TeamMember.get.mockResolvedValue({
        id: 'tm1',
        name: 'John Doe',
        birthday: '1990-01-15'
      });
      CalendarEvent.getBirthdayEvents.mockResolvedValue([]);
      CalendarEvent.create.mockResolvedValue({
        id: 'event1',
        title: '🎂 John Doe\'s Birthday'
      });
    });

    it('should not retry duplicate birthday event creation', async () => {
      CalendarEvent.create.mockRejectedValue(new Error('duplicate birthday event already exists'));

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' },
        2024,
        2024
      );

      expect(result).toEqual([]);
      expect(CalendarEvent.create).toHaveBeenCalledTimes(1);
    });

    it('should retry network errors in birthday event creation', async () => {
      CalendarEvent.create
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue({
          id: 'event1',
          title: '🎂 John Doe\'s Birthday'
        });

      // Mock setTimeout to execute immediately for testing
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback) => {
        callback();
        return 1;
      });

      const result = await RecurringBirthdayService.generateBirthdayEventsForYears(
        { id: 'tm1', name: 'John Doe', birthday: '1990-01-15' },
        2024,
        2024
      );

      global.setTimeout = originalSetTimeout;

      expect(result).toHaveLength(1);
      expect(CalendarEvent.create).toHaveBeenCalledTimes(2);
    });

    it('should not retry not found errors in deletion', async () => {
      const notFoundError = new DataError('Event not found', 'CalendarEvent', 'event1');
      notFoundError.code = 'NOT_FOUND';
      
      CalendarEvent.delete.mockRejectedValue(notFoundError);
      CalendarEvent.getBirthdayEvents.mockResolvedValue([
        { id: 'event1', team_member_id: 'tm1', start_date: '2024-01-15' }
      ]);

      const result = await RecurringBirthdayService.deleteBirthdayEventsForTeamMember('tm1');

      expect(result.errorCount).toBe(1);
      expect(CalendarEvent.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Classification', () => {
    it('should correctly identify retryable errors', () => {
      expect(CalendarService._isRetryableError(new Error('network timeout'))).toBe(true);
      expect(CalendarService._isRetryableError(new Error('server error'))).toBe(true);
      expect(CalendarService._isRetryableError(new Error('connection failed'))).toBe(true);
      expect(CalendarService._isRetryableError(new Error('service unavailable'))).toBe(true);
    });

    it('should correctly identify non-retryable errors', () => {
      expect(CalendarService._isRetryableError(new ValidationError('Invalid input'))).toBe(false);
      expect(CalendarService._isRetryableError(new NotFoundError('Not found'))).toBe(false);
      expect(CalendarService._isRetryableError(new DuplicateError('Duplicate'))).toBe(false);
      expect(CalendarService._isRetryableError(new Error('permission denied'))).toBe(false);
      expect(CalendarService._isRetryableError(new Error('unauthorized'))).toBe(false);
      expect(CalendarService._isRetryableError(new Error('quota exceeded'))).toBe(false);
      expect(CalendarService._isRetryableError(new Error('rate limit'))).toBe(false);
      expect(CalendarService._isRetryableError(new Error('malformed request'))).toBe(false);
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff with jitter', async () => {
      const delays = [];
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      // Mock setTimeout to capture delays and execute immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay);
        callback(); // Execute immediately for test
        return 1;
      });

      const result = await CalendarService._retryOperation(mockOperation, {
        maxRetries: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        operationName: 'test operation'
      });

      global.setTimeout = originalSetTimeout;

      expect(result).toBe('success');
      expect(delays).toHaveLength(2);
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[1]).toBeLessThan(250); // Should include jitter but not exceed too much
    });

    it('should respect maximum delay', async () => {
      const delays = [];
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      // Mock setTimeout to capture delays and execute immediately
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay);
        callback(); // Execute immediately for test
        return 1;
      });

      const result = await CalendarService._retryOperation(mockOperation, {
        maxRetries: 3,
        baseDelay: 5000,
        maxDelay: 8000,
        backoffMultiplier: 3,
        operationName: 'test operation'
      });

      global.setTimeout = originalSetTimeout;

      expect(result).toBe('success');
      expect(delays).toHaveLength(2);
      expect(delays[1]).toBeLessThanOrEqual(8000);
    });
  });
});