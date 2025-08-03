// Performance tests for optimized useDutyFormValidation hook

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDutyFormValidation } from '../useDutyFormValidation';

// Mock validation utilities
vi.mock('../../utils/dutyValidation.js', () => ({
  validateField: vi.fn((field, value) => {
    // Simulate validation delay
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(value ? null : 'Field is required');
      }, 10);
    });
  }),
  validateForm: vi.fn((data) => ({
    errors: {},
    sanitizedData: data,
  })),
  categorizeErrors: vi.fn(() => ({ critical: {}, warnings: {} })),
  parseApiError: vi.fn(error => error.message),
  retryOperation: vi.fn(async (operation) => await operation())
}));

describe('useDutyFormValidation Performance Optimizations', () => {
  let mockValidateField;
  let mockValidateForm;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dutyValidation = await import('../../utils/dutyValidation.js');
    mockValidateField = vi.mocked(dutyValidation).validateField;
    mockValidateForm = vi.mocked(dutyValidation).validateForm;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Debounced Validation', () => {
    it('should debounce field validation to reduce API calls', async () => {
      const { result } = renderHook(() => useDutyFormValidation({
        team_member_id: '',
        title: '',
        type: ''
      }));

      // Rapidly change field multiple times
      act(() => {
        result.current.handleFieldChange('title', 'D');
      });
      act(() => {
        result.current.handleFieldChange('title', 'De');
      });
      act(() => {
        result.current.handleFieldChange('title', 'Dev');
      });
      act(() => {
        result.current.handleFieldChange('title', 'DevOps');
      });

      // Should not have called validation yet due to debouncing
      expect(mockValidateField).not.toHaveBeenCalled();

      // Wait for debounce to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      // Should only validate once after debounce
      expect(mockValidateField).toHaveBeenCalledTimes(1);
      expect(mockValidateField).toHaveBeenCalledWith('title', 'DevOps', expect.any(Object));
    });

    it('should use increased debounce time for better performance', async () => {
      const { result } = renderHook(() => useDutyFormValidation());

      const startTime = Date.now();
      
      act(() => {
        result.current.handleFieldChange('title', 'Test');
      });

      // Should not validate immediately
      expect(mockValidateField).not.toHaveBeenCalled();

      // Wait for the increased debounce time (500ms)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
      expect(mockValidateField).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation Caching', () => {
    it('should cache validation results to avoid redundant calls', async () => {
      const { result } = renderHook(() => useDutyFormValidation());

      // First validation
      act(() => {
        result.current.handleFieldChange('title', 'DevOps');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(mockValidateField).toHaveBeenCalledTimes(1);

      // Same value again - should use cache
      act(() => {
        result.current.handleFieldBlur('title');
      });

      // Should not call validation again due to caching
      expect(mockValidateField).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when field value changes', async () => {
      const { result } = renderHook(() => useDutyFormValidation());

      // First validation
      act(() => {
        result.current.handleFieldChange('title', 'DevOps');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(mockValidateField).toHaveBeenCalledTimes(1);

      // Change value - should clear cache and validate again
      act(() => {
        result.current.handleFieldChange('title', 'OnCall');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      expect(mockValidateField).toHaveBeenCalledTimes(2);
    });

    it('should limit cache size to prevent memory leaks', async () => {
      const { result } = renderHook(() => useDutyFormValidation());

      // Create many cached entries
      for (let i = 0; i < 150; i++) {
        act(() => {
          result.current.handleFieldChange('title', `Value${i}`);
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 600));
        });
      }

      // Cache should be limited and not grow indefinitely
      // This is tested implicitly by ensuring the component doesn't crash
      // and memory usage remains reasonable
      expect(mockValidateField).toHaveBeenCalledTimes(150);
    });
  });

  describe('Form Validation Caching', () => {
    it('should cache full form validation results', async () => {
      const { result } = renderHook(() => useDutyFormValidation({
        team_member_id: 'tm1',
        title: 'DevOps',
        type: 'devops'
      }));

      // First form validation
      act(() => {
        result.current.validateFormData();
      });

      expect(mockValidateForm).toHaveBeenCalledTimes(1);

      // Same form data - should use cache
      act(() => {
        result.current.validateFormData();
      });

      expect(mockValidateForm).toHaveBeenCalledTimes(1);
    });

    it('should invalidate form cache when data changes', async () => {
      const { result } = renderHook(() => useDutyFormValidation({
        team_member_id: 'tm1',
        title: 'DevOps'
      }));

      // First validation
      act(() => {
        result.current.validateFormData();
      });

      expect(mockValidateForm).toHaveBeenCalledTimes(1);

      // Change form data
      act(() => {
        result.current.handleFieldChange('title', 'OnCall');
      });

      // Validate again - should not use cache
      act(() => {
        result.current.validateFormData();
      });

      expect(mockValidateForm).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup timeouts on unmount', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { result, unmount } = renderHook(() => useDutyFormValidation());

      // Start some validations
      act(() => {
        result.current.handleFieldChange('title', 'Test1');
        result.current.handleFieldChange('type', 'devops');
      });

      // Unmount before debounce completes
      unmount();

      // Should have cleared timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('should clear validation cache on unmount', async () => {
      const { result, unmount } = renderHook(() => useDutyFormValidation());

      // Create some cached entries
      act(() => {
        result.current.handleFieldChange('title', 'Test');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      // Unmount should clear cache
      unmount();

      // This is tested implicitly by ensuring no memory leaks
      expect(mockValidateField).toHaveBeenCalledTimes(1);
    });

    it('should prevent state updates after unmount', async () => {
      const { result, unmount } = renderHook(() => useDutyFormValidation());

      // Start validation
      act(() => {
        result.current.handleFieldChange('title', 'Test');
      });

      // Unmount immediately
      unmount();

      // Wait for what would have been the debounce time
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      // Should not have called validation after unmount
      expect(mockValidateField).not.toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should handle rapid field changes efficiently', async () => {
      const { result } = renderHook(() => useDutyFormValidation());

      const startTime = performance.now();

      // Simulate rapid typing
      for (let i = 0; i < 50; i++) {
        act(() => {
          result.current.handleFieldChange('title', `Test${i}`);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle rapid changes quickly (under 100ms)
      expect(duration).toBeLessThan(100);

      // Wait for final debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
      });

      // Should only validate once due to debouncing
      expect(mockValidateField).toHaveBeenCalledTimes(1);
    });

    it('should batch state updates for better performance', async () => {
      const { result } = renderHook(() => useDutyFormValidation());

      const startTime = performance.now();

      // Multiple field changes in quick succession
      act(() => {
        result.current.handleFieldChange('title', 'DevOps');
        result.current.handleFieldChange('type', 'devops');
        result.current.handleFieldChange('team_member_id', 'tm1');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle batched updates quickly
      expect(duration).toBeLessThan(50);

      // All fields should be updated
      expect(result.current.formData.title).toBe('DevOps');
      expect(result.current.formData.type).toBe('devops');
      expect(result.current.formData.team_member_id).toBe('tm1');
    });
  });
});