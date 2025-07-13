import { useState, useCallback, useMemo } from 'react';
import { safeArray } from '../utils/arrayUtils.js';
import { sanitizeInput, createValidator } from '../utils/validation.js';

/**
 * Custom hook for form state management
 * @param {Object} initialData - Initial form data
 * @param {Object} options - Configuration options
 * @returns {Object} - Form state and handlers
 */
export const useForm = (initialData = {}, options = {}) => {
  const {
    validate = null,
    sanitize = false,
    arrayFields = [],
    onSubmit = null,
    resetOnSubmit = false
  } = options;

  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized validation function
  const validator = useMemo(() => {
    if (validate && typeof validate === 'object') {
      return createValidator(validate);
    }
    return validate;
  }, [validate]);

  // Handle field changes
  const handleChange = useCallback((field, value) => {
    let processedValue = value;

    // Handle array fields
    if (arrayFields.includes(field)) {
      processedValue = safeArray(value);
    }

    // Sanitize input if enabled
    if (sanitize && typeof processedValue === 'string') {
      processedValue = sanitizeInput.text(processedValue);
    } else if (sanitize && Array.isArray(processedValue)) {
      processedValue = sanitizeInput.array(processedValue);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [arrayFields, sanitize, errors]);

  // Handle field blur (for validation)
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    // Validate single field if validator exists
    if (validator && typeof validator === 'function') {
      const validationResult = validator({ [field]: formData[field] });
      if (!validationResult.isValid && validationResult.errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: validationResult.errors[field]
        }));
      }
    }
  }, [validator, formData]);

  // Validate entire form
  const validateForm = useCallback(() => {
    if (!validator) return { isValid: true, errors: {} };

    const validationResult = validator(formData);
    setErrors(validationResult.errors);
    return validationResult;
  }, [validator, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (event) => {
    if (event) {
      event.preventDefault();
    }

    if (isSubmitting) return;

    const validationResult = validateForm();
    if (!validationResult.isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }

      if (resetOnSubmit) {
        setFormData(initialData);
        setErrors({});
        setTouched({});
      }
    } catch (error) {
      console.error('Form submission failed:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, validateForm, onSubmit, resetOnSubmit, initialData]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  // Set field error
  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    hasChanges,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateForm,
    setFieldError,
    clearFieldError,
    clearErrors,
    setFormData
  };
};

/**
 * Custom hook for managing dialog forms
 * @param {Object} entityApi - API methods (create, update, delete)
 * @param {Function} onSuccess - Success callback
 * @param {Object} options - Configuration options
 * @returns {Object} - Dialog form state and handlers
 */
export const useDialogForm = (entityApi, onSuccess, options = {}) => {
  const {
    defaultFormData = {},
    validate = null,
    sanitize = false,
    arrayFields = []
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const formOptions = {
    validate,
    sanitize,
    arrayFields,
    onSubmit: async (formData) => {
      if (editingItem) {
        await entityApi.update(editingItem.id, formData);
      } else {
        await entityApi.create(formData);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      closeDialog();
    },
    resetOnSubmit: false
  };

  const form = useForm(defaultFormData, formOptions);

  const openCreateDialog = useCallback(() => {
    form.resetForm();
    setEditingItem(null);
    setIsOpen(true);
  }, [form]);

  const openEditDialog = useCallback((item) => {
    form.setFormData(item);
    setEditingItem(item);
    setIsOpen(true);
  }, [form]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
    form.resetForm();
  }, [form]);

  const openDeleteConfirm = useCallback((item) => {
    setDeleteConfirmItem(item);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmItem(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmItem) return;

    try {
      await entityApi.delete(deleteConfirmItem.id);
      
      if (onSuccess) {
        onSuccess();
      }
      
      closeDeleteConfirm();
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  }, [deleteConfirmItem, entityApi, onSuccess, closeDeleteConfirm]);

  return {
    ...form,
    isOpen,
    editingItem,
    deleteConfirmItem,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete
  };
};

/**
 * Custom hook for search/filter functionality
 * @param {Array} items - Items to search/filter
 * @param {Object} options - Search configuration
 * @returns {Object} - Search state and handlers
 */
export const useSearch = (items = [], options = {}) => {
  const {
    searchFields = ['name', 'title'],
    filterFields = {},
    sortField = null,
    sortDirection = 'asc',
    debounceDelay = 300
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(filterFields);
  const [currentSort, setCurrentSort] = useState({
    field: sortField,
    direction: sortDirection
  });

  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            filtered = filtered.filter(item => 
              value.includes(item[field])
            );
          }
        } else {
          filtered = filtered.filter(item => 
            item[field] === value
          );
        }
      }
    });

    // Apply sorting
    if (currentSort.field) {
      filtered.sort((a, b) => {
        const aValue = a[currentSort.field];
        const bValue = b[currentSort.field];
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return currentSort.direction === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [items, searchTerm, filters, currentSort, searchFields]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFilter = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSort = useCallback((field) => {
    setCurrentSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters(filterFields);
  }, [filterFields]);

  return {
    searchTerm,
    filters,
    currentSort,
    filteredItems,
    handleSearch,
    handleFilter,
    handleSort,
    clearFilters
  };
};