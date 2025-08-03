import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDutyFormValidation, useDutyFormSubmission } from '../useDutyFormValidation';

// Mock the validation utilities
vi.mock('../../utils/dutyValidation.js', () => ({
  validateField: vi.fn(),
  validateForm: vi.fn(),
  categorizeErrors: vi.fn(),
  parseApiError: vi.fn(),
  retryOperation: vi.fn()
}));

import { validateField, validateForm, categorizeErrors, parseApiError } from '../../utils/dutyValidation.js';

describe('useDutyFormValidation - Comprehensive Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateField.mockReturnValue(null);
    validateForm.mockReturnValue({ errors: {}, sanitizedData: {} });
    categorizeErrors.mockReturnValue({ critical: {}, warnings: {}, info: {} });
    parseApiError.mockReturnValue('Generic error message');
  });

  describe('Form State Management', () => {
    it('should initialize with empty form data by default', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      expect(result.current.formData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.fieldTouched).toEqual({});
      expect(result.current.validationStatus).toBe(null);
      expect(result.current.isValidating).toBe(false);
    });

    it('should initialize with provided initial data', () => {
      const initialData = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const { result } = renderHook(() => useDutyFormValidation(initialData));
      
      expect(result.current.formData).toEqual(initialData);
    });

    it('should handle field changes correctly', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
      });
      
      expect(result.current.formData.team_member_id).toBe('tm1');
      expect(result.current.fieldTouched.team_member_id).toBe(true);
    });

    it('should handle multiple field changes', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
        result.current.handleFieldChange('type', 'devops');
        result.current.handleFieldChange('title', 'DevOps');
      });
      
      expect(result.current.formData).toEqual({
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps'
      });
      
      expect(result.current.fieldTouched).toEqual({
        team_member_id: true,
        type: true,
        title: true
      });
    });

    it('should handle field blur with validation', () => {
      validateField.mockReturnValue('Field is required');
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      act(() => {
        result.current.handleFieldChange('team_member_id', '');
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(validateField).toHaveBeenCalledWith('team_member_id', '', { team_member_id: '' });
      expect(result.current.errors.team_member_id).toBe('Field is required');
      expect(result.current.fieldTouched.team_member_id).toBe(true);
    });

    it('should clear field errors when field becomes valid', () => {
      validateField.mockReturnValueOnce('Field is required').mockReturnValueOnce(null);
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      // First make field invalid
      act(() => {
        result.current.handleFieldChange('team_member_id', '');
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(result.current.errors.team_member_id).toBe('Field is required');
      
      // Then make field valid
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(result.current.errors.team_member_id).toBe(null);
    });
  });

  describe('Form Validation', () => {
    it('should validate entire form and return results', () => {
      const formErrors = { team_member_id: 'Required', type: 'Required' };
      const sanitizedData = { team_member_id: '', type: '' };
      const categorized = { 
        critical: { team_member_id: 'Required' }, 
        warnings: { type: 'Required' }, 
        info: {} 
      };
      
      validateForm.mockReturnValue({ errors: formErrors, sanitizedData });
      categorizeErrors.mockReturnValue(categorized);
      
      const { result } = renderHook(() => useDutyFormValidation({
        team_member_id: '',
        type: ''
      }));
      
      let validationResult;
      act(() => {
        validationResult = result.current.validateFormData();
      });
      
      expect(validateForm).toHaveBeenCalledWith({ team_member_id: '', type: '' });
      expect(categorizeErrors).toHaveBeenCalledWith(formErrors);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toEqual(formErrors);
      expect(validationResult.sanitizedData).toEqual(sanitizedData);
      expect(validationResult.categorized).toEqual(categorized);
      
      expect(result.current.errors).toEqual(formErrors);
      expect(result.current.validationStatus).toBe('error');
    });

    it('should handle successful validation', () => {
      validateForm.mockReturnValue({ errors: {}, sanitizedData: { team_member_id: 'tm1' } });
      categorizeErrors.mockReturnValue({ critical: {}, warnings: {}, info: {} });
      
      const { result } = renderHook(() => useDutyFormValidation({
        team_member_id: 'tm1'
      }));
      
      let validationResult;
      act(() => {
        validationResult = result.current.validateFormData();
      });
      
      expect(validationResult.isValid).toBe(true);
      expect(result.current.validationStatus).toBe('success');
      expect(result.current.hasErrors).toBe(false);
      expect(result.current.isFormValid).toBe(true);
    });

    it('should compute hasErrors correctly', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Initially no errors
      expect(result.current.hasErrors).toBe(false);
      
      // Add an error
      act(() => {
        result.current.handleFieldChange('team_member_id', '');
        result.current.handleFieldBlur('team_member_id');
      });
      
      validateField.mockReturnValue('Field is required');
      
      act(() => {
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(result.current.hasErrors).toBe(true);
    });

    it('should compute isFormValid correctly', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Initially invalid (empty form)
      expect(result.current.isFormValid).toBe(false);
      
      // Mock successful validation
      validateForm.mockReturnValue({ errors: {}, sanitizedData: { team_member_id: 'tm1' } });
      
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
        result.current.validateFormData();
      });
      
      expect(result.current.isFormValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors and categorize them', () => {
      const error = new Error('Network connection failed');
      parseApiError.mockReturnValue('Connection failed. Please check your network.');
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      let errorInfo;
      act(() => {
        errorInfo = result.current.handleApiError(error);
      });
      
      expect(parseApiError).toHaveBeenCalledWith(error);
      expect(errorInfo.message).toBe('Connection failed. Please check your network.');
      expect(errorInfo.isRetryable).toBe(true);
      expect(errorInfo.canRetry).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const validationError = new Error('Invalid data format');
      parseApiError.mockReturnValue('Invalid data provided');
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      let errorInfo;
      act(() => {
        errorInfo = result.current.handleApiError(validationError);
      });
      
      expect(errorInfo.message).toBe('Invalid data provided');
      expect(errorInfo.isRetryable).toBe(false);
      expect(errorInfo.canRetry).toBe(false);
    });

    it('should handle duplicate detection errors', () => {
      const duplicateError = new Error('Duplicate entry detected');
      parseApiError.mockReturnValue('A similar duty already exists');
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      let errorInfo;
      act(() => {
        errorInfo = result.current.handleApiError(duplicateError);
      });
      
      expect(errorInfo.message).toBe('A similar duty already exists');
      expect(errorInfo.isDuplicate).toBe(true);
      expect(errorInfo.isRetryable).toBe(false);
    });
  });

  describe('Form Reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Set some state
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
        result.current.handleFieldChange('type', 'devops');
        result.current.handleFieldBlur('team_member_id');
      });
      
      // Reset form
      act(() => {
        result.current.resetForm();
      });
      
      expect(result.current.formData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.fieldTouched).toEqual({});
      expect(result.current.validationStatus).toBe(null);
    });

    it('should reset form with new initial data', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Set some state
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
        result.current.handleFieldBlur('team_member_id');
      });
      
      // Reset with new data
      const newData = { team_member_id: 'tm2', type: 'on_call' };
      act(() => {
        result.current.resetForm(newData);
      });
      
      expect(result.current.formData).toEqual(newData);
      expect(result.current.errors).toEqual({});
      expect(result.current.fieldTouched).toEqual({});
      expect(result.current.validationStatus).toBe(null);
    });
  });

  describe('Field Utilities', () => {
    it('should return field error only when field is touched', () => {
      validateField.mockReturnValue('Field is required');
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Set error but don't touch field
      act(() => {
        result.current.handleFieldChange('team_member_id', '');
      });
      
      expect(result.current.getFieldError('team_member_id')).toBe(null);
      
      // Touch field
      act(() => {
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(result.current.getFieldError('team_member_id')).toBe('Field is required');
    });

    it('should return correct field validation state', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Default state
      expect(result.current.getFieldValidationState('team_member_id')).toBe('default');
      
      // Valid field
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(result.current.getFieldValidationState('team_member_id')).toBe('success');
      
      // Invalid field
      validateField.mockReturnValue('Field is required');
      act(() => {
        result.current.handleFieldChange('team_member_id', '');
        result.current.handleFieldBlur('team_member_id');
      });
      
      expect(result.current.getFieldValidationState('team_member_id')).toBe('error');
    });

    it('should handle field validation state for untouched fields', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      // Untouched field with value
      act(() => {
        result.current.handleFieldChange('team_member_id', 'tm1');
      });
      
      expect(result.current.getFieldValidationState('team_member_id')).toBe('default');
    });
  });

  describe('Validation Status Management', () => {
    it('should track validation status correctly', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      expect(result.current.validationStatus).toBe(null);
      
      // Trigger validation with errors
      validateForm.mockReturnValue({ errors: { team_member_id: 'Required' }, sanitizedData: {} });
      
      act(() => {
        result.current.validateFormData();
      });
      
      expect(result.current.validationStatus).toBe('error');
      
      // Trigger successful validation
      validateForm.mockReturnValue({ errors: {}, sanitizedData: { team_member_id: 'tm1' } });
      
      act(() => {
        result.current.validateFormData();
      });
      
      expect(result.current.validationStatus).toBe('success');
    });

    it('should handle validation in progress state', () => {
      const { result } = renderHook(() => useDutyFormValidation());
      
      expect(result.current.isValidating).toBe(false);
      
      // This would be set by the component during async validation
      // The hook itself doesn't manage async state, but provides the interface
    });
  });

  describe('Error Categorization', () => {
    it('should categorize errors by severity', () => {
      const formErrors = {
        team_member_id: 'Required field',
        start_date: 'Invalid date format',
        description: 'Too long'
      };
      
      const categorized = {
        critical: { team_member_id: 'Required field' },
        warnings: { start_date: 'Invalid date format' },
        info: { description: 'Too long' }
      };
      
      validateForm.mockReturnValue({ errors: formErrors, sanitizedData: {} });
      categorizeErrors.mockReturnValue(categorized);
      
      const { result } = renderHook(() => useDutyFormValidation());
      
      let validationResult;
      act(() => {
        validationResult = result.current.validateFormData();
      });
      
      expect(categorizeErrors).toHaveBeenCalledWith(formErrors);
      expect(validationResult.categorized).toEqual(categorized);
    });
  });
});

describe('useDutyFormSubmission - Comprehensive Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    parseApiError.mockReturnValue('Generic error message');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Submission State Management', () => {
    it('should initialize with default submission state', () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submitError).toBe(null);
      expect(result.current.submitSuccess).toBe(false);
      expect(result.current.canSubmit).toBe(true);
      expect(result.current.lastSubmissionTime).toBe(null);
    });

    it('should handle successful submission', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1', title: 'Test Duty' });
      
      let submitResult;
      await act(async () => {
        submitResult = await result.current.handleSubmit(mockOperation);
      });
      
      expect(submitResult.success).toBe(true);
      expect(submitResult.data).toEqual({ id: 'duty1', title: 'Test Duty' });
      expect(result.current.submitSuccess).toBe(true);
      expect(result.current.submitError).toBe(null);
      expect(result.current.isSubmitting).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle failed submission', async () => {
      parseApiError.mockReturnValue('Save operation failed');
      
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      let submitResult;
      await act(async () => {
        submitResult = await result.current.handleSubmit(mockOperation);
      });
      
      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBe('Save operation failed');
      expect(result.current.submitError.message).toBe('Save operation failed');
      expect(result.current.submitSuccess).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should track submission timing', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
      
      const beforeSubmit = Date.now();
      
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.lastSubmissionTime).toBeGreaterThanOrEqual(beforeSubmit);
    });
  });

  describe('Double Submission Prevention', () => {
    it('should prevent double submission while in progress', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      
      // Start first submission
      act(() => {
        result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.isSubmitting).toBe(true);
      expect(result.current.canSubmit).toBe(false);
      
      // Try second submission
      let secondResult;
      await act(async () => {
        secondResult = await result.current.handleSubmit(mockOperation);
      });
      
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Submission in progress or too frequent');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should prevent rapid successive submissions', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
      
      // First submission
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.canSubmit).toBe(false);
      
      // Immediate second submission (within 2 seconds)
      let secondResult;
      await act(async () => {
        secondResult = await result.current.handleSubmit(mockOperation);
      });
      
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Submission in progress or too frequent');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should allow submission after cooldown period', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
      
      // First submission
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      // Advance time by 3 seconds (beyond cooldown)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(result.current.canSubmit).toBe(true);
      
      // Second submission should now be allowed
      let secondResult;
      await act(async () => {
        secondResult = await result.current.handleSubmit(mockOperation);
      });
      
      expect(secondResult.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Success Message Management', () => {
    it('should auto-hide success message after timeout', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
      
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.submitSuccess).toBe(true);
      
      // Advance time by 3 seconds (default success display time)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(result.current.submitSuccess).toBe(false);
    });

    it('should allow custom success display duration', async () => {
      const { result } = renderHook(() => useDutyFormSubmission({ successDisplayTime: 5000 }));
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
      
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.submitSuccess).toBe(true);
      
      // Advance time by 3 seconds (less than custom duration)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(result.current.submitSuccess).toBe(true);
      
      // Advance time by 2 more seconds (total 5 seconds)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(result.current.submitSuccess).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after failed submission', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'duty1' });
      
      // First submission fails
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.submitError).toBeTruthy();
      expect(result.current.canSubmit).toBe(true); // Should allow retry
      
      // Retry submission
      let retryResult;
      await act(async () => {
        retryResult = await result.current.retrySubmission(mockOperation);
      });
      
      expect(retryResult.success).toBe(true);
      expect(result.current.submitError).toBe(null);
      expect(result.current.submitSuccess).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should clear errors on successful retry', async () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 'duty1' });
      
      // First submission fails
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(result.current.submitError).toBeTruthy();
      
      // Successful retry
      await act(async () => {
        await result.current.retrySubmission(mockOperation);
      });
      
      expect(result.current.submitError).toBe(null);
      expect(result.current.submitSuccess).toBe(true);
    });
  });

  describe('State Cleanup', () => {
    it('should clear submission state', () => {
      const { result } = renderHook(() => useDutyFormSubmission());
      
      // Manually set some state for testing
      act(() => {
        // This would normally be set by handleSubmit
        result.current.clearSubmissionState();
      });
      
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submitError).toBe(null);
      expect(result.current.submitSuccess).toBe(false);
    });

    it('should cleanup timers on unmount', () => {
      const { result, unmount } = renderHook(() => useDutyFormSubmission());
      
      // Start a submission to create timers
      act(async () => {
        const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
        await result.current.handleSubmit(mockOperation);
      });
      
      // Unmount should cleanup timers
      unmount();
      
      // Advance time - success should not be cleared since component unmounted
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // No assertions needed - just ensuring no errors occur
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom cooldown period', async () => {
      const { result } = renderHook(() => useDutyFormSubmission({ cooldownPeriod: 5000 }));
      const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
      
      // First submission
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      // Advance time by 3 seconds (less than custom cooldown)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(result.current.canSubmit).toBe(false);
      
      // Advance time by 2 more seconds (total 5 seconds)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(result.current.canSubmit).toBe(true);
    });

    it('should handle custom error parsing', async () => {
      const customErrorParser = vi.fn().mockReturnValue('Custom error message');
      const { result } = renderHook(() => useDutyFormSubmission({ errorParser: customErrorParser }));
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await act(async () => {
        await result.current.handleSubmit(mockOperation);
      });
      
      expect(customErrorParser).toHaveBeenCalledWith(expect.any(Error));
      expect(result.current.submitError.message).toBe('Custom error message');
    });
  });
});