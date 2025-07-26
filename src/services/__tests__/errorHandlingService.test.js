/**
 * Tests for ErrorHandlingService
 * Verifies comprehensive error handling, user feedback, and recovery mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ErrorHandlingService,
  CalendarError,
  ValidationError,
  NetworkError,
  DataError,
  SynchronizationError
} from '../errorHandlingService.js';
import { toast } from '@/components/ui/use-toast';

// Mock the toast function
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toast.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Classes', () => {
    it('should create CalendarError with proper properties', () => {
      const error = new CalendarError('Test error', 'TEST_CODE', new Error('Original'));
      
      expect(error.name).toBe('CalendarError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.originalError).toBeInstanceOf(Error);
      expect(error.timestamp).toBeDefined();
    });

    it('should create ValidationError with field information', () => {
      const error = new ValidationError('Invalid field', 'email', 'invalid-email');
      
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('email');
      expect(error.value).toBe('invalid-email');
    });

    it('should create NetworkError with retry capability', () => {
      const error = new NetworkError('Network failed', 'fetch_data');
      
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.operation).toBe('fetch_data');
      expect(error.isRetryable).toBe(true);
    });

    it('should create DataError without retry capability', () => {
      const error = new DataError('Data corrupted', 'User', '123');
      
      expect(error.name).toBe('DataError');
      expect(error.code).toBe('DATA_ERROR');
      expect(error.entityType).toBe('User');
      expect(error.entityId).toBe('123');
      expect(error.isRetryable).toBe(false);
    });

    it('should create SynchronizationError with retry capability', () => {
      const error = new SynchronizationError('Sync failed', 'calendar_sync');
      
      expect(error.name).toBe('SynchronizationError');
      expect(error.code).toBe('SYNC_ERROR');
      expect(error.syncType).toBe('calendar_sync');
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize ValidationError correctly', () => {
      const error = new ValidationError('Invalid input');
      const category = ErrorHandlingService.categorizeError(error);
      
      expect(category).toBe(ErrorHandlingService.CATEGORIES.VALIDATION);
    });

    it('should categorize NetworkError correctly', () => {
      const error = new NetworkError('Connection failed');
      const category = ErrorHandlingService.categorizeError(error);
      
      expect(category).toBe(ErrorHandlingService.CATEGORIES.NETWORK);
    });

    it('should categorize by message patterns', () => {
      const networkError = new Error('Network connection failed');
      const validationError = new Error('Validation failed for field');
      const permissionError = new Error('Permission denied');
      
      expect(ErrorHandlingService.categorizeError(networkError))
        .toBe(ErrorHandlingService.CATEGORIES.NETWORK);
      expect(ErrorHandlingService.categorizeError(validationError))
        .toBe(ErrorHandlingService.CATEGORIES.VALIDATION);
      expect(ErrorHandlingService.categorizeError(permissionError))
        .toBe(ErrorHandlingService.CATEGORIES.PERMISSION);
    });

    it('should default to unknown category', () => {
      const error = new Error('Some random error');
      const category = ErrorHandlingService.categorizeError(error);
      
      expect(category).toBe(ErrorHandlingService.CATEGORIES.UNKNOWN);
    });
  });

  describe('Error Information Generation', () => {
    it('should generate appropriate info for validation errors', () => {
      const error = new ValidationError('Required field missing');
      const info = ErrorHandlingService.getErrorInfo(error, ErrorHandlingService.CATEGORIES.VALIDATION);
      
      expect(info.userMessage).toBe('Please check your input and try again');
      expect(info.isRetryable).toBe(false);
      expect(info.suggestions).toContain('Verify all required fields are filled');
    });

    it('should generate appropriate info for network errors', () => {
      const error = new NetworkError('Connection timeout');
      const info = ErrorHandlingService.getErrorInfo(error, ErrorHandlingService.CATEGORIES.NETWORK);
      
      expect(info.userMessage).toBe('Connection issue occurred. Please try again.');
      expect(info.isRetryable).toBe(true);
      expect(info.suggestions).toContain('Check your internet connection');
    });

    it('should generate appropriate info for sync errors', () => {
      const error = new SynchronizationError('Sync failed');
      const info = ErrorHandlingService.getErrorInfo(error, ErrorHandlingService.CATEGORIES.SYNC);
      
      expect(info.userMessage).toBe('Synchronization failed. Calendar data may be outdated.');
      expect(info.isRetryable).toBe(true);
      expect(info.suggestions).toContain('Try manual sync from the calendar toolbar');
    });
  });

  describe('Error Handling', () => {
    it('should handle error with toast notification', () => {
      const error = new ValidationError('Invalid input');
      
      const result = ErrorHandlingService.handleError(error, {
        operation: 'test operation',
        showToast: true
      });
      
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'test operation Failed',
        description: expect.stringContaining('Please check your input'),
        duration: 5000
      });
      
      expect(result.category).toBe(ErrorHandlingService.CATEGORIES.VALIDATION);
      expect(result.isRetryable).toBe(false);
    });

    it('should handle critical errors with persistent toast', () => {
      const error = new Error('Critical system failure');
      
      ErrorHandlingService.handleError(error, {
        operation: 'critical operation',
        severity: ErrorHandlingService.SEVERITY.CRITICAL,
        showToast: true
      });
      
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Critical Error',
        description: expect.any(String),
        duration: 0 // Persistent
      });
    });

    it('should log errors appropriately', () => {
      const error = new Error('Test error');
      
      ErrorHandlingService.handleError(error, {
        operation: 'test operation',
        severity: ErrorHandlingService.SEVERITY.HIGH,
        logError: true
      });
      
      expect(console.error).toHaveBeenCalledWith('ERROR:', expect.objectContaining({
        operation: 'test operation',
        message: 'Test error',
        severity: ErrorHandlingService.SEVERITY.HIGH
      }));
    });
  });

  describe('Retry Logic', () => {
    it('should retry operation with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError('Network error');
        }
        return 'success';
      });

      const result = await ErrorHandlingService.retryOperation(operation, {
        maxRetries: 3,
        baseDelay: 10, // Short delay for testing
        operationName: 'test operation'
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry validation errors', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid input'));

      await expect(ErrorHandlingService.retryOperation(operation, {
        maxRetries: 3,
        operationName: 'test operation'
      })).rejects.toThrow(ValidationError);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect custom shouldRetry function', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Custom error'));
      const shouldRetry = vi.fn().mockReturnValue(false);

      await expect(ErrorHandlingService.retryOperation(operation, {
        maxRetries: 3,
        shouldRetry,
        operationName: 'test operation'
      })).rejects.toThrow('Custom error');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should call onRetry callback', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new NetworkError('Network error');
        }
        return 'success';
      });
      const onRetry = vi.fn();

      await ErrorHandlingService.retryOperation(operation, {
        maxRetries: 3,
        baseDelay: 10,
        onRetry,
        operationName: 'test operation'
      });

      expect(onRetry).toHaveBeenCalledWith(
        expect.any(NetworkError),
        1,
        10
      );
    });
  });

  describe('Success Notifications', () => {
    it('should show success toast', () => {
      ErrorHandlingService.showSuccess('Operation completed');
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Operation completed',
        variant: 'default',
        duration: 3000
      });
    });

    it('should show success toast with custom options', () => {
      ErrorHandlingService.showSuccess('Custom message', {
        title: 'Custom Success',
        duration: 5000,
        description: 'Custom description'
      });
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Custom Success',
        description: 'Custom description',
        variant: 'default',
        duration: 5000
      });
    });
  });

  describe('Loading States', () => {
    it('should create loading controller', () => {
      const controller = ErrorHandlingService.showLoading('test operation');
      
      expect(controller).toHaveProperty('update');
      expect(controller).toHaveProperty('dismiss');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.dismiss).toBe('function');
      
      // Test that loading toast was created
      expect(toast).toHaveBeenCalledWith({
        title: 'Loading...',
        description: 'test operation in progress...',
        duration: 0,
        variant: 'default'
      });
    });
  });

  describe('Operation Wrapping', () => {
    it('should wrap successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await ErrorHandlingService.wrapOperation(operation, {
        operationName: 'test operation',
        showSuccess: true,
        successMessage: 'Test completed'
      });
      
      expect(result).toBe('success');
      expect(toast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Test completed',
        variant: 'default',
        duration: 3000
      });
    });

    it('should wrap failed operation with retry', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new NetworkError('Network error');
        }
        return 'success';
      });
      
      const result = await ErrorHandlingService.wrapOperation(operation, {
        operationName: 'test operation',
        retryOptions: {
          maxRetries: 2,
          baseDelay: 10
        }
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle operation failure', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid input'));
      
      await expect(ErrorHandlingService.wrapOperation(operation, {
        operationName: 'test operation'
      })).rejects.toThrow(ValidationError);
      
      expect(toast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'test operation Failed',
        description: expect.stringContaining('Please check your input'),
        duration: 5000
      });
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', () => {
      expect(() => {
        ErrorHandlingService.validateParams({}, {
          name: { required: true }
        });
      }).toThrow(ValidationError);
    });

    it('should validate parameter types', () => {
      expect(() => {
        ErrorHandlingService.validateParams({ age: 'not a number' }, {
          age: { type: 'number' }
        });
      }).toThrow(ValidationError);
    });

    it('should validate string length', () => {
      expect(() => {
        ErrorHandlingService.validateParams({ name: 'ab' }, {
          name: { minLength: 3 }
        });
      }).toThrow(ValidationError);
      
      expect(() => {
        ErrorHandlingService.validateParams({ name: 'very long name' }, {
          name: { maxLength: 5 }
        });
      }).toThrow(ValidationError);
    });

    it('should validate with custom function', () => {
      expect(() => {
        ErrorHandlingService.validateParams({ email: 'invalid' }, {
          email: { 
            custom: (value) => value.includes('@'),
            customMessage: 'Email must contain @'
          }
        });
      }).toThrow(ValidationError);
    });

    it('should pass valid parameters', () => {
      expect(() => {
        ErrorHandlingService.validateParams({
          name: 'John Doe',
          age: 30,
          email: 'john@example.com'
        }, {
          name: { required: true, type: 'string', minLength: 2 },
          age: { type: 'number' },
          email: { 
            custom: (value) => value.includes('@'),
            customMessage: 'Email must contain @'
          }
        });
      }).not.toThrow();
    });
  });

  describe('Recovery Actions', () => {
    it('should create recovery action', () => {
      const recoveryFn = vi.fn();
      const action = ErrorHandlingService.createRecoveryAction(recoveryFn, 'Retry Operation');
      
      expect(action.label).toBe('Retry Operation');
      expect(action.action).toBe(recoveryFn);
    });
  });
});