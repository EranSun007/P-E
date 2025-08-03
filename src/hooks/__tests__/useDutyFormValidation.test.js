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

describe('useDutyFormValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateField.mockReturnValue(null);
    validateForm.mockReturnValue({});
    categorizeErrors.mockReturnValue({ critical: {}, warnings: {}, info: {} });
    parseApiError.mockReturnValue('User-friendly error message');
  });

  it('should initialize with default form data', () => {
    const { result } = renderHook(() => useDutyFormValidation());
    
    expect(result.current.formData).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.isFormValid).toBe(false);
  });

  it('should initialize with provided initial data', () => {
    const initialData = { team_member_id: 'tm1', type: 'devops' };
    const { result } = renderHook(() => useDutyFormValidation(initialData));
    
    expect(result.current.formData).toEqual(initialData);
  });

  it('should handle field changes with validation', () => {
    const { result } = renderHook(() => useDutyFormValidation());
    
    act(() => {
      result.current.handleFieldChange('team_member_id', 'tm1');
    });
    
    expect(result.current.formData.team_member_id).toBe('tm1');
    expect(result.current.fieldTouched.team_member_id).toBe(true);
  });

  it('should handle field blur with immediate validation', () => {
    validateField.mockReturnValue('Field is required');
    
    const { result } = renderHook(() => useDutyFormValidation({ team_member_id: '' }));
    
    act(() => {
      result.current.handleFieldBlur('team_member_id');
    });
    
    expect(validateField).toHaveBeenCalledWith('team_member_id', '', { team_member_id: '' });
    expect(result.current.errors.team_member_id).toBe('Field is required');
    expect(result.current.fieldTouched.team_member_id).toBe(true);
  });

  it('should validate entire form', () => {
    const formErrors = { team_member_id: 'Required' };
    const sanitizedData = { team_member_id: '' };
    const categorized = { critical: { team_member_id: 'Required' }, warnings: {}, info: {} };
    
    validateForm.mockReturnValue({ errors: formErrors, sanitizedData });
    categorizeErrors.mockReturnValue(categorized);
    
    const { result } = renderHook(() => useDutyFormValidation({ team_member_id: '' }));
    
    let validationResult;
    act(() => {
      validationResult = result.current.validateFormData();
    });
    
    expect(validateForm).toHaveBeenCalledWith({ team_member_id: '' });
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors).toEqual(formErrors);
    expect(validationResult.sanitizedData).toEqual(sanitizedData);
    expect(result.current.validationStatus).toBe('error');
  });

  it('should reset form and validation state', () => {
    const { result } = renderHook(() => useDutyFormValidation());
    
    // Set some state
    act(() => {
      result.current.handleFieldChange('team_member_id', 'tm1');
      result.current.handleFieldBlur('team_member_id');
    });
    
    // Reset form
    act(() => {
      result.current.resetForm({ type: 'devops' });
    });
    
    expect(result.current.formData).toEqual({ type: 'devops' });
    expect(result.current.errors).toEqual({});
    expect(result.current.fieldTouched).toEqual({});
    expect(result.current.validationStatus).toBe(null);
  });

  it('should handle API errors', () => {
    const error = new Error('Network error');
    parseApiError.mockReturnValue('Connection failed');
    
    const { result } = renderHook(() => useDutyFormValidation());
    
    let errorInfo;
    act(() => {
      errorInfo = result.current.handleApiError(error);
    });
    
    expect(parseApiError).toHaveBeenCalledWith(error);
    expect(errorInfo.message).toBe('Connection failed');
    expect(errorInfo.isRetryable).toBe(true);
  });

  it('should identify non-retryable errors', () => {
    const duplicateError = new Error('Duplicate entry detected');
    parseApiError.mockReturnValue('Duplicate detected');
    
    const { result } = renderHook(() => useDutyFormValidation());
    
    let errorInfo;
    act(() => {
      errorInfo = result.current.handleApiError(duplicateError);
    });
    
    expect(errorInfo.isRetryable).toBe(false);
    expect(errorInfo.canRetry).toBe(false);
  });

  it('should get field error only when touched', () => {
    validateField.mockReturnValue('Field is required');
    
    const { result } = renderHook(() => useDutyFormValidation());
    
    // Set error but don't touch field
    act(() => {
      result.current.handleFieldChange('team_member_id', '');
    });
    
    // Should not show error until touched
    expect(result.current.getFieldError('team_member_id')).toBe(null);
    
    // Touch field
    act(() => {
      result.current.handleFieldBlur('team_member_id');
    });
    
    // Now should show error
    expect(result.current.getFieldError('team_member_id')).toBe('Field is required');
  });

  it('should get field validation state for styling', () => {
    const { result } = renderHook(() => useDutyFormValidation());
    
    // Default state
    expect(result.current.getFieldValidationState('team_member_id')).toBe('default');
    
    // With value and touched
    act(() => {
      result.current.handleFieldChange('team_member_id', 'tm1');
      result.current.handleFieldBlur('team_member_id');
    });
    
    expect(result.current.getFieldValidationState('team_member_id')).toBe('success');
    
    // With error
    validateField.mockReturnValue('Field is required');
    act(() => {
      result.current.handleFieldChange('team_member_id', '');
      result.current.handleFieldBlur('team_member_id');
    });
    
    expect(result.current.getFieldValidationState('team_member_id')).toBe('error');
  });
});

describe('useDutyFormSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default submission state', () => {
    const { result } = renderHook(() => useDutyFormSubmission());
    
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBe(null);
    expect(result.current.submitSuccess).toBe(false);
    expect(result.current.canSubmit).toBe(true);
  });

  it('should handle successful submission', async () => {
    const { result } = renderHook(() => useDutyFormSubmission());
    const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
    
    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(mockOperation);
    });
    
    expect(submitResult.success).toBe(true);
    expect(submitResult.data).toEqual({ id: 'duty1' });
    expect(result.current.submitSuccess).toBe(true);
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should handle failed submission', async () => {
    parseApiError.mockReturnValue('Save failed');
    
    const { result } = renderHook(() => useDutyFormSubmission());
    const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
    
    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(mockOperation);
    });
    
    expect(submitResult.success).toBe(false);
    expect(submitResult.error).toBe('Save failed');
    expect(result.current.submitError.message).toBe('Save failed');
    expect(result.current.submitSuccess).toBe(false);
  });

  it('should prevent double submission', async () => {
    const { result } = renderHook(() => useDutyFormSubmission());
    const mockOperation = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    
    // Start first submission
    act(() => {
      result.current.handleSubmit(mockOperation);
    });
    
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
    
    // Immediate second submission (within 2 seconds)
    let secondResult;
    await act(async () => {
      secondResult = await result.current.handleSubmit(mockOperation);
    });
    
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toBe('Submission in progress or too frequent');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should allow submission after time delay', async () => {
    const { result } = renderHook(() => useDutyFormSubmission());
    const mockOperation = vi.fn().mockResolvedValue({ id: 'duty1' });
    
    // First submission
    await act(async () => {
      await result.current.handleSubmit(mockOperation);
    });
    
    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Second submission should now be allowed
    let secondResult;
    await act(async () => {
      secondResult = await result.current.handleSubmit(mockOperation);
    });
    
    expect(secondResult.success).toBe(true);
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should auto-hide success message', async () => {
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

  it('should clear submission state', () => {
    const { result } = renderHook(() => useDutyFormSubmission());
    
    // Set some state manually for testing
    act(() => {
      result.current.clearSubmissionState();
    });
    
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBe(null);
    expect(result.current.submitSuccess).toBe(false);
  });

  it('should retry submission when possible', async () => {
    const { result } = renderHook(() => useDutyFormSubmission());
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ id: 'duty1' });
    
    // First submission fails
    await act(async () => {
      await result.current.handleSubmit(mockOperation);
    });
    
    expect(result.current.submitError).toBeTruthy();
    
    // Retry submission
    let retryResult;
    await act(async () => {
      retryResult = await result.current.retrySubmission(mockOperation);
    });
    
    expect(retryResult.success).toBe(true);
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});