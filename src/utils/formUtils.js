// Form utilities to eliminate form handling duplication

import { safeArray } from './arrayUtils.js';
import { sanitizeInput } from './validation.js';

/**
 * Creates a generic form handler for state updates
 * @param {Function} setFormData - State setter function
 * @param {Array} arrayFields - Fields that should be treated as arrays
 * @param {Object} options - Additional options
 * @returns {Function} - Form handler function
 */
export const createFormHandler = (setFormData, arrayFields = [], options = {}) => {
  const { sanitize = false, validate = null } = options;
  
  return (field, value) => {
    let processedValue = value;
    
    // Handle array fields
    if (arrayFields.includes(field)) {
      processedValue = safeArray(value);
    }
    
    // Sanitize input if requested
    if (sanitize) {
      if (typeof processedValue === 'string') {
        processedValue = sanitizeInput.text(processedValue);
      } else if (Array.isArray(processedValue)) {
        processedValue = sanitizeInput.array(processedValue);
      }
    }
    
    // Validate if validator provided
    if (validate) {
      const validationResult = validate(field, processedValue);
      if (!validationResult.isValid) {
        console.warn(`Validation failed for field ${field}:`, validationResult.error);
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };
};

/**
 * Creates a form reset handler
 * @param {Function} setFormData - State setter function
 * @param {Object} defaultData - Default form data
 * @returns {Function} - Reset handler function
 */
export const createFormReset = (setFormData, defaultData = {}) => {
  return () => {
    setFormData(defaultData);
  };
};

/**
 * Creates a form submission handler
 * @param {Function} onSubmit - Submit callback
 * @param {Function} validate - Validation function
 * @param {Object} options - Additional options
 * @returns {Function} - Submit handler function
 */
export const createFormSubmit = (onSubmit, validate = null, options = {}) => {
  const { 
    preventDefault = true, 
    resetOnSuccess = false, 
    resetHandler = null,
    loadingHandler = null
  } = options;
  
  return async (formData, event) => {
    if (preventDefault && event) {
      event.preventDefault();
    }
    
    // Set loading state
    if (loadingHandler) {
      loadingHandler(true);
    }
    
    try {
      // Validate form if validator provided
      if (validate) {
        const validationResult = validate(formData);
        if (!validationResult.isValid) {
          throw new Error('Validation failed');
        }
      }
      
      // Submit form
      await onSubmit(formData);
      
      // Reset form if requested
      if (resetOnSuccess && resetHandler) {
        resetHandler();
      }
      
    } catch (error) {
      console.error('Form submission failed:', error);
      throw error;
    } finally {
      // Clear loading state
      if (loadingHandler) {
        loadingHandler(false);
      }
    }
  };
};

/**
 * Hook for managing form state with validation
 * @param {Object} initialData - Initial form data
 * @param {Object} options - Configuration options
 * @returns {Object} - Form state and handlers
 */
export const useFormState = (initialData = {}, options = {}) => {
  const { 
    arrayFields = [], 
    sanitize = false, 
    validate = null,
    onSubmit = null
  } = options;
  
  const [formData, setFormData] = React.useState(initialData);
  const [errors, setErrors] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const handleChange = React.useCallback(
    createFormHandler(setFormData, arrayFields, { sanitize, validate }),
    [arrayFields, sanitize, validate]
  );
  
  const handleReset = React.useCallback(
    createFormReset(setFormData, initialData),
    [initialData]
  );
  
  const handleSubmit = React.useCallback(
    createFormSubmit(onSubmit, validate, {
      resetOnSuccess: true,
      resetHandler: handleReset,
      loadingHandler: setIsSubmitting
    }),
    [onSubmit, validate, handleReset]
  );
  
  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);
  
  const clearError = React.useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);
  
  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleReset,
    handleSubmit,
    clearErrors,
    clearError,
    setFormData,
    setErrors
  };
};

/**
 * Creates a dialog form handler
 * @param {Function} entityApi - API methods (create, update)
 * @param {Function} onSuccess - Success callback
 * @param {Object} options - Additional options
 * @returns {Object} - Dialog form handlers
 */
export const createDialogFormHandler = (entityApi, onSuccess, options = {}) => {
  const { defaultFormData = {}, validate = null } = options;
  
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState(null);
  const [formData, setFormData] = React.useState(defaultFormData);
  const [error, setError] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const openCreateDialog = React.useCallback(() => {
    setFormData(defaultFormData);
    setEditingItem(null);
    setError(null);
    setShowDialog(true);
  }, [defaultFormData]);
  
  const openEditDialog = React.useCallback((item) => {
    setFormData(item);
    setEditingItem(item);
    setError(null);
    setShowDialog(true);
  }, []);
  
  const closeDialog = React.useCallback(() => {
    setShowDialog(false);
    setEditingItem(null);
    setFormData(defaultFormData);
    setError(null);
  }, [defaultFormData]);
  
  const handleSubmit = React.useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate if validator provided
      if (validate) {
        const validationResult = validate(formData);
        if (!validationResult.isValid) {
          setError('Please check the form for errors');
          return;
        }
      }
      
      // Submit to API
      if (editingItem) {
        await entityApi.update(editingItem.id, formData);
      } else {
        await entityApi.create(formData);
      }
      
      // Success callback
      if (onSuccess) {
        onSuccess();
      }
      
      closeDialog();
      
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingItem, entityApi, validate, onSuccess, closeDialog, isSubmitting]);
  
  return {
    showDialog,
    editingItem,
    formData,
    error,
    isSubmitting,
    setFormData,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSubmit
  };
};

/**
 * Utility to extract form data from an event
 * @param {Event} event - Form event
 * @returns {Object} - Form data object
 */
export const extractFormData = (event) => {
  const formData = new FormData(event.target);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      // Handle multiple values (like checkboxes)
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }
  
  return data;
};

/**
 * Utility to check if form has unsaved changes
 * @param {Object} currentData - Current form data
 * @param {Object} initialData - Initial form data
 * @returns {boolean} - True if form has changes
 */
export const hasFormChanges = (currentData, initialData) => {
  return JSON.stringify(currentData) !== JSON.stringify(initialData);
};

/**
 * Utility to get form validation errors
 * @param {Object} formData - Form data to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} - Validation errors
 */
export const getFormErrors = (formData, schema) => {
  const errors = {};
  
  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = formData[field];
    
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = `${field} is required`;
    }
    
    if (rules.minLength && value && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors[field] = `${field} must be no more than ${rules.maxLength} characters`;
    }
    
    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${field} format is invalid`;
    }
  });
  
  return errors;
};