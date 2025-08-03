import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  validateField, 
  validateForm, 
  sanitizeField,
  sanitizeFormData,
  categorizeErrors, 
  parseApiError, 
  retryOperation as utilRetryOperation 
} from '../utils/dutyValidation.js';

/**
 * Custom hook for duty form validation and error handling with performance optimizations
 */
export function useDutyFormValidation(initialData = {}) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [fieldTouched, setFieldTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use refs for cleanup and performance optimization
  const validationTimeoutsRef = useRef({});
  const isUnmountedRef = useRef(false);
  const validationCacheRef = useRef(new Map());

  // Memoized validation cache key generator
  const getValidationCacheKey = useCallback((fieldName, value, contextData) => {
    return `${fieldName}:${value}:${JSON.stringify(contextData)}`;
  }, []);

  // Optimized real-time field validation with debouncing and caching
  const validateFieldRealTime = useCallback((fieldName, value, debounceMs = 500) => {
    // Skip validation if component is unmounted
    if (isUnmountedRef.current) return;

    // Clear existing timeout for this field
    if (validationTimeoutsRef.current[fieldName]) {
      clearTimeout(validationTimeoutsRef.current[fieldName]);
    }

    // Check cache first for performance
    const cacheKey = getValidationCacheKey(fieldName, value, formData);
    const cachedResult = validationCacheRef.current.get(cacheKey);
    
    if (cachedResult !== undefined) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: cachedResult
      }));
      return;
    }

    // Set new timeout for validation with increased debounce for better performance
    const timeoutId = setTimeout(async () => {
      if (isUnmountedRef.current) return;
      
      try {
        const error = await validateField(fieldName, value, formData);
        
        if (isUnmountedRef.current) return;
        
        // Cache the result
        validationCacheRef.current.set(cacheKey, error);
        
        // Limit cache size to prevent memory leaks
        if (validationCacheRef.current.size > 100) {
          const firstKey = validationCacheRef.current.keys().next().value;
          validationCacheRef.current.delete(firstKey);
        }
        
        setErrors(prev => ({
          ...prev,
          [fieldName]: error
        }));
      } catch (validationError) {
        console.error('Validation error:', validationError);
      }
      
      // Clean up timeout reference
      delete validationTimeoutsRef.current[fieldName];
    }, debounceMs);
    
    // Store timeout reference
    validationTimeoutsRef.current[fieldName] = timeoutId;
  }, [formData, getValidationCacheKey]);

  // Cleanup timeouts and cache on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      // Clear all validation timeouts
      Object.values(validationTimeoutsRef.current).forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      validationTimeoutsRef.current = {};
      
      // Clear validation cache
      validationCacheRef.current.clear();
    };
  }, []);

  // Optimized field change handler with batched updates
  const handleFieldChange = useCallback((fieldName, value) => {
    // Skip if component is unmounted
    if (isUnmountedRef.current) return;

    // Batch state updates for better performance
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    setFieldTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Clear existing error for this field immediately
    setErrors(prev => ({
      ...prev,
      [fieldName]: null
    }));

    // Clear validation cache for this field when value changes
    const keysToDelete = [];
    for (const key of validationCacheRef.current.keys()) {
      if (key.startsWith(`${fieldName}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => validationCacheRef.current.delete(key));

    // Trigger real-time validation with optimized debouncing
    validateFieldRealTime(fieldName, value);
  }, [validateFieldRealTime]);

  // Optimized field blur handler with caching
  const handleFieldBlur = useCallback(async (fieldName) => {
    // Skip if component is unmounted
    if (isUnmountedRef.current) return;

    setFieldTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Check cache first
    const cacheKey = getValidationCacheKey(fieldName, formData[fieldName], formData);
    const cachedResult = validationCacheRef.current.get(cacheKey);
    
    if (cachedResult !== undefined) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: cachedResult
      }));
      return;
    }

    try {
      // Validate and cache result
      const error = await validateField(fieldName, formData[fieldName], formData);
      
      if (isUnmountedRef.current) return;
      
      validationCacheRef.current.set(cacheKey, error);
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    } catch (validationError) {
      console.error('Field validation error:', validationError);
    }
  }, [formData, getValidationCacheKey]);

  // Memoized form validation with caching
  const validateFormData = useCallback(() => {
    // Skip if component is unmounted
    if (isUnmountedRef.current) {
      return { isValid: false, errors: {}, sanitizedData: {}, categorized: {} };
    }

    // Check cache for full form validation
    const formCacheKey = `form:${JSON.stringify(formData)}`;
    const cachedFormResult = validationCacheRef.current.get(formCacheKey);
    
    if (cachedFormResult) {
      setErrors(cachedFormResult.errors);
      setValidationStatus(cachedFormResult.status);
      return cachedFormResult.result;
    }

    const validationResult = validateForm(formData);
    const formErrors = validationResult.errors;
    const sanitizedData = validationResult.sanitizedData;
    const categorized = categorizeErrors(formErrors);
    
    // Determine validation status
    const hasCriticalErrors = Object.keys(categorized.critical).length > 0;
    const hasWarnings = Object.keys(categorized.warnings).length > 0;
    
    let status;
    if (hasCriticalErrors) {
      status = 'error';
    } else if (hasWarnings) {
      status = 'warning';
    } else {
      status = 'success';
    }
    
    const result = {
      isValid: !hasCriticalErrors,
      errors: formErrors,
      sanitizedData,
      categorized
    };

    // Cache the result
    const cacheEntry = {
      errors: formErrors,
      status,
      result
    };
    validationCacheRef.current.set(formCacheKey, cacheEntry);
    
    setErrors(formErrors);
    setValidationStatus(status);
    
    return result;
  }, [formData]);

  // Optimized form reset with cleanup
  const resetForm = useCallback((newData = {}) => {
    // Skip if component is unmounted
    if (isUnmountedRef.current) return;

    // Clear all validation timeouts
    Object.values(validationTimeoutsRef.current).forEach(timeoutId => {
      if (timeoutId) clearTimeout(timeoutId);
    });
    validationTimeoutsRef.current = {};
    
    // Clear validation cache
    validationCacheRef.current.clear();
    
    // Reset state
    setFormData(newData);
    setErrors({});
    setFieldTouched({});
    setValidationStatus(null);
    setRetryCount(0);
  }, []);

  // Handle API errors with retry logic
  const handleApiError = useCallback((error, operation) => {
    const userFriendlyMessage = parseApiError(error);
    
    // Determine if error is retryable
    const errorMessage = error.message?.toLowerCase() || '';
    const isRetryable = !errorMessage.includes('duplicate') && 
                       !errorMessage.includes('validation') && 
                       !errorMessage.includes('permission') &&
                       !errorMessage.includes('unauthorized');
    
    return {
      message: userFriendlyMessage,
      isRetryable,
      canRetry: isRetryable && retryCount < 3,
      originalError: error
    };
  }, [retryCount]);

  // Retry failed operation
  const retryOperation = useCallback(async (operation) => {
    setRetryCount(prev => prev + 1);
    setIsValidating(true);
    
    try {
      const result = await operation();
      setRetryCount(0); // Reset on success
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Get field error with touch state consideration
  const getFieldError = useCallback((fieldName) => {
    // Only show error if field has been touched or form has been submitted
    if (!fieldTouched[fieldName] && validationStatus !== 'error') {
      return null;
    }
    return errors[fieldName];
  }, [errors, fieldTouched, validationStatus]);

  // Get field validation state for styling
  const getFieldValidationState = useCallback((fieldName) => {
    const error = getFieldError(fieldName);
    const value = formData[fieldName];
    
    if (error) {
      return 'error';
    } else if (fieldTouched[fieldName] && value) {
      return 'success';
    }
    return 'default';
  }, [getFieldError, formData, fieldTouched]);

  // Check if form has any errors
  const hasErrors = errors && Object.values(errors).some(error => error !== null);
  
  // Check if form is ready for submission
  const isFormValid = !hasErrors && Object.keys(formData).length > 0;

  return {
    // Form data
    formData,
    setFormData,
    
    // Validation state
    errors,
    fieldTouched,
    isValidating,
    validationStatus,
    hasErrors,
    isFormValid,
    
    // Field handlers
    handleFieldChange,
    handleFieldBlur,
    getFieldError,
    getFieldValidationState,
    
    // Form validation
    validateFormData,
    resetForm,
    
    // Error handling
    handleApiError,
    retryOperation: retryOperation,
    retryCount,
    
    // Utility functions
    categorizeErrors: (errs) => categorizeErrors(errs || errors)
  };
}

/**
 * Hook for managing form submission state with error handling
 */
export function useDutyFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(null);

  // Prevent double submission
  const canSubmit = useCallback(() => {
    if (isSubmitting) return false;
    
    // Prevent rapid successive submissions (within 2 seconds)
    if (lastSubmissionTime) {
      const timeSinceLastSubmit = Date.now() - lastSubmissionTime;
      if (timeSinceLastSubmit < 2000) {
        return false;
      }
    }
    
    return true;
  }, [isSubmitting, lastSubmissionTime]);

  // Handle form submission with error handling and retry logic
  const handleSubmit = useCallback(async (submitOperation, options = {}) => {
    if (!canSubmit()) {
      return { success: false, error: 'Submission in progress or too frequent' };
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setLastSubmissionTime(Date.now());

    try {
      // Use retry logic for network-related errors
      const result = await utilRetryOperation(submitOperation, options.retryConfig);
      
      setSubmitSuccess(true);
      
      // Auto-hide success message after delay
      if (options.autoHideSuccess !== false) {
        setTimeout(() => {
          setSubmitSuccess(false);
        }, options.successDisplayTime || 3000);
      }
      
      return { success: true, data: result };
    } catch (error) {
      const userFriendlyMessage = parseApiError(error);
      const isRetryable = !error.message?.toLowerCase().includes('duplicate') && 
                         !error.message?.toLowerCase().includes('validation') && 
                         !error.message?.toLowerCase().includes('permission');
      
      setSubmitError({
        message: userFriendlyMessage,
        originalError: error,
        canRetry: isRetryable
      });
      
      return { success: false, error: userFriendlyMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit]);

  // Clear submission state
  const clearSubmissionState = useCallback(() => {
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmitSuccess(false);
    setLastSubmissionTime(null);
  }, []);

  // Retry last submission
  const retrySubmission = useCallback(async (submitOperation) => {
    if (submitError?.canRetry) {
      return handleSubmit(submitOperation);
    }
    return { success: false, error: 'Cannot retry this operation' };
  }, [submitError, handleSubmit]);

  return {
    isSubmitting,
    submitError,
    submitSuccess,
    canSubmit: canSubmit(),
    handleSubmit,
    clearSubmissionState,
    retrySubmission
  };
}