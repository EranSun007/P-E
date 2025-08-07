/**
 * Comprehensive validation utilities for duty creation and management
 */

/**
 * Input sanitization utilities
 */
export const INPUT_SANITIZERS = {
  // Remove HTML tags and dangerous characters
  sanitizeText: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim(); // Remove leading/trailing whitespace
  },
  
  // Sanitize and normalize whitespace
  sanitizeDescription: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim() // Remove leading/trailing whitespace
      .substring(0, 500); // Enforce max length
  },
  
  // Sanitize date input
  sanitizeDate: (input) => {
    if (!input) return input;
    
    // Convert to string and remove any non-date characters
    const sanitized = input.toString().replace(/[^0-9-]/g, '');
    
    // Validate basic date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
      return null;
    }
    
    // Additional validation for realistic date ranges
    const year = parseInt(sanitized.substring(0, 4));
    const month = parseInt(sanitized.substring(5, 7));
    const day = parseInt(sanitized.substring(8, 10));
    
    // Check for reasonable year range (1900-2100)
    if (year < 1900 || year > 2100) return null;
    
    // Check for valid month (1-12)
    if (month < 1 || month > 12) return null;
    
    // Check for valid day (1-31, basic check)
    if (day < 1 || day > 31) return null;
    
    return sanitized;
  },
  
  // Sanitize select values against allowed options
  sanitizeSelectValue: (input, allowedValues) => {
    if (!input || !Array.isArray(allowedValues)) return null;
    
    const sanitized = input.toString().trim();
    return allowedValues.includes(sanitized) ? sanitized : null;
  },
  
  // Sanitize ID values
  sanitizeId: (input) => {
    if (!input) return input;
    
    // Only allow alphanumeric characters, hyphens, and underscores
    const sanitized = input.toString().replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Ensure reasonable length (max 50 characters)
    return sanitized.substring(0, 50);
  },
  
  // Sanitize all form data
  sanitizeFormData: (formData) => {
    const sanitized = {};
    
    // Define allowed fields and their sanitizers
    const fieldSanitizers = {
      team_member_id: (value) => INPUT_SANITIZERS.sanitizeId(value),
      type: (value) => INPUT_SANITIZERS.sanitizeSelectValue(value, ['devops', 'on_call', 'other']),
      title: (value) => INPUT_SANITIZERS.sanitizeSelectValue(value, ['Reporting', 'Metering', 'DevOps']),
      description: (value) => INPUT_SANITIZERS.sanitizeDescription(value),
      start_date: (value) => INPUT_SANITIZERS.sanitizeDate(value),
      end_date: (value) => INPUT_SANITIZERS.sanitizeDate(value),
      creation_session_id: (value) => INPUT_SANITIZERS.sanitizeId(value)
    };
    
    // Sanitize each field
    Object.keys(formData).forEach(key => {
      if (fieldSanitizers[key]) {
        sanitized[key] = fieldSanitizers[key](formData[key]);
      } else {
        // For unknown fields, apply basic text sanitization
        sanitized[key] = INPUT_SANITIZERS.sanitizeText(formData[key]);
      }
    });
    
    return sanitized;
  }
};

/**
 * Enhanced validation schema with comprehensive input sanitization and validation
 */
export const DUTY_VALIDATION_SCHEMA = {
  team_member_id: {
    required: true,
    message: 'Team member is required',
    sanitize: (value) => INPUT_SANITIZERS.sanitizeId(value),
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'Team member is required';
      }
      
      // Validate format (should be a valid ID)
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'Invalid team member ID format';
      }
      
      return null;
    }
  },
  type: {
    required: true,
    message: 'Duty type is required',
    sanitize: (value) => INPUT_SANITIZERS.sanitizeSelectValue(value, ['devops', 'on_call', 'other']),
    validate: (value) => {
      const validTypes = ['devops', 'on_call', 'other'];
      
      if (!value || value.trim() === '') {
        return 'Duty type is required';
      }
      
      if (!validTypes.includes(value)) {
        return `Invalid duty type. Must be one of: ${validTypes.join(', ')}`;
      }
      
      return null;
    }
  },
  title: {
    required: true,
    message: 'Title is required',
    sanitize: (value) => INPUT_SANITIZERS.sanitizeSelectValue(value, ['Reporting', 'Metering', 'DevOps']),
    validate: (value) => {
      const validTitles = ['Reporting', 'Metering', 'DevOps'];
      
      if (!value || value.trim() === '') {
        return 'Title is required';
      }
      
      if (!validTitles.includes(value)) {
        return 'Please select a valid title from the dropdown';
      }
      
      return null;
    }
  },
  description: {
    required: false,
    maxLength: 500,
    sanitize: (value) => INPUT_SANITIZERS.sanitizeDescription(value),
    validate: (value) => {
      if (!value) return null; // Optional field
      
      if (typeof value !== 'string') {
        return 'Description must be text';
      }
      
      if (value.length > 500) {
        return 'Description must be under 500 characters';
      }
      
      // Check for potentially malicious content
      if (/<script|javascript:|data:|vbscript:/i.test(value)) {
        return 'Description contains invalid content';
      }
      
      return null;
    }
  },
  start_date: {
    required: true,
    message: 'Start date is required',
    sanitize: (value) => INPUT_SANITIZERS.sanitizeDate(value),
    validate: (value, formData) => {
      if (!value || value.trim() === '') {
        return 'Start date is required';
      }
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'Start date must be in YYYY-MM-DD format';
      }
      
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if date is valid
      if (isNaN(startDate.getTime())) {
        return 'Please enter a valid start date';
      }
      
      // Check if date is too far in the past (more than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (startDate < oneYearAgo) {
        return 'Start date cannot be more than 1 year in the past';
      }
      
      // Check if date is too far in the future (more than 2 years)
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (startDate > twoYearsFromNow) {
        return 'Start date cannot be more than 2 years in the future';
      }
      
      // Cross-field validation with end_date
      if (formData?.end_date) {
        const endDate = new Date(formData.end_date);
        if (!isNaN(endDate.getTime()) && startDate >= endDate) {
          return 'Start date must be before end date';
        }
      }
      
      return null;
    }
  },
  end_date: {
    required: true,
    message: 'End date is required',
    sanitize: (value) => INPUT_SANITIZERS.sanitizeDate(value),
    validate: (value, formData) => {
      if (!value || value.trim() === '') {
        return 'End date is required';
      }
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'End date must be in YYYY-MM-DD format';
      }
      
      const endDate = new Date(value);
      
      // Check if date is valid
      if (isNaN(endDate.getTime())) {
        return 'Please enter a valid end date';
      }
      
      // Check if date is too far in the future (more than 2 years)
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (endDate > twoYearsFromNow) {
        return 'End date cannot be more than 2 years in the future';
      }
      
      // Cross-field validation with start_date
      if (formData?.start_date) {
        const startDate = new Date(formData.start_date);
        
        if (!isNaN(startDate.getTime())) {
          // Check if duty period is too short (same day)
          if (endDate.getTime() === startDate.getTime()) {
            return 'Duty period must be at least 1 day';
          }
          
          if (endDate <= startDate) {
            return 'End date must be after start date';
          }
          
          // Check if duty period is too long (more than 1 year)
          const oneYearFromStart = new Date(startDate);
          oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
          if (endDate > oneYearFromStart) {
            return 'Duty period cannot exceed 1 year';
          }
          
          // Check for minimum duty period (at least 1 day)
          const timeDiff = endDate.getTime() - startDate.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          if (daysDiff < 1) {
            return 'Duty period must be at least 1 day';
          }
        }
      }
      
      return null;
    }
  },
  creation_session_id: {
    required: false,
    sanitize: (value) => INPUT_SANITIZERS.sanitizeId(value),
    validate: (value) => {
      if (!value) return null; // Optional field
      
      // Validate session ID format
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        return 'Invalid session ID format';
      }
      
      return null;
    }
  }
};

/**
 * Sanitizes a single field based on the validation schema
 */
export function sanitizeField(fieldName, value) {
  const fieldSchema = DUTY_VALIDATION_SCHEMA[fieldName];
  if (!fieldSchema || !fieldSchema.sanitize) {
    // Default sanitization for unknown fields
    return INPUT_SANITIZERS.sanitizeText(value);
  }
  
  return fieldSchema.sanitize(value);
}

/**
 * Validates a single field based on the validation schema
 */
export function validateField(fieldName, value, formData = {}) {
  const fieldSchema = DUTY_VALIDATION_SCHEMA[fieldName];
  if (!fieldSchema) return null;
  
  // Sanitize the value first
  const sanitizedValue = sanitizeField(fieldName, value);
  
  // Check required fields
  if (fieldSchema.required && (!sanitizedValue || sanitizedValue.toString().trim() === '')) {
    return fieldSchema.message || `${fieldName} is required`;
  }
  
  // Skip further validation if field is empty and not required
  if (!sanitizedValue || sanitizedValue.toString().trim() === '') {
    return null;
  }
  
  // Run custom validation function with sanitized value
  if (fieldSchema.validate) {
    return fieldSchema.validate(sanitizedValue, formData);
  }
  
  return null;
}

/**
 * Sanitizes all fields in the form data
 */
export function sanitizeFormData(formData) {
  const sanitized = {};
  
  // Sanitize each field using the schema
  Object.keys(formData).forEach(fieldName => {
    sanitized[fieldName] = sanitizeField(fieldName, formData[fieldName]);
  });
  
  return sanitized;
}

/**
 * Validates all fields in the form data with sanitization
 */
export function validateForm(formData) {
  const errors = {};
  
  // First sanitize the form data
  const sanitizedData = sanitizeFormData(formData);
  
  // Validate each field with sanitized data
  Object.keys(DUTY_VALIDATION_SCHEMA).forEach(fieldName => {
    const error = validateField(fieldName, sanitizedData[fieldName], sanitizedData);
    if (error) {
      errors[fieldName] = error;
    }
  });
  
  // Additional cross-field business rules with sanitized data
  const businessRuleErrors = validateBusinessRules(sanitizedData);
  Object.assign(errors, businessRuleErrors);
  
  return {
    errors,
    sanitizedData
  };
}

/**
 * Validates business rules that span multiple fields
 */
export function validateBusinessRules(formData) {
  const errors = {};
  
  // Weekend duty validation (business rule example)
  if (formData.start_date && formData.type === 'on_call') {
    const startDate = new Date(formData.start_date);
    const dayOfWeek = startDate.getDay();
    
    // If it's a weekend (Saturday = 6, Sunday = 0) and on-call duty
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // This is just a warning, not a blocking error
      // Store warnings separately so they don't block form submission
      errors._warnings = errors._warnings || [];
      errors._warnings.push('On-call duties starting on weekends may require additional approval');
    }
  }
  
  // Holiday period validation (business rule example)
  if (formData.start_date && formData.end_date) {
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    // Check if duty spans major holidays (simplified example)
    const isHolidayPeriod = isWithinHolidayPeriod(startDate, endDate);
    if (isHolidayPeriod) {
      errors._warnings = errors._warnings || [];
      errors._warnings.push('This duty period includes major holidays. Please ensure adequate coverage.');
    }
  }
  
  return errors;
}

/**
 * Helper function to check if a date range includes major holidays
 */
function isWithinHolidayPeriod(startDate, endDate) {
  const year = startDate.getFullYear();
  
  // Major holidays (simplified - in real app, this would be more comprehensive)
  const holidays = [
    new Date(year, 11, 25), // Christmas
    new Date(year, 0, 1),   // New Year's Day
    new Date(year, 6, 4),   // Independence Day (US)
  ];
  
  return holidays.some(holiday => holiday >= startDate && holiday <= endDate);
}

/**
 * Categorizes errors by severity for better UX
 */
export function categorizeErrors(errors) {
  const categorized = {
    critical: {},    // Prevents form submission
    warnings: {},    // Allows submission with confirmation
    info: {}        // Informational messages
  };
  
  Object.entries(errors).forEach(([field, error]) => {
    if (field === '_warnings') {
      categorized.warnings._general = error;
      return;
    }
    
    // Categorize based on field importance and error type
    if (['team_member_id', 'type', 'title', 'start_date', 'end_date'].includes(field)) {
      categorized.critical[field] = error;
    } else if (field === 'description') {
      categorized.warnings[field] = error;
    } else {
      categorized.info[field] = error;
    }
  });
  
  return categorized;
}

/**
 * Network error handling utilities
 */
export const NETWORK_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request timed out. Please try again.',
  SERVER_ERROR: 'A server error occurred. Please try again in a few moments.',
  VALIDATION_ERROR: 'The data you entered is invalid. Please check your inputs and try again.',
  DUPLICATE_ERROR: 'A duplicate entry was detected. Please review your input.',
  CONFLICT_ERROR: 'This duty conflicts with existing assignments. Please adjust the dates or team member.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND_ERROR: 'The requested resource was not found.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

/**
 * Parses API errors and returns user-friendly messages
 */
export function parseApiError(error) {
  if (!error) return NETWORK_ERROR_MESSAGES.UNKNOWN_ERROR;
  
  const errorMessage = error.message || error.toString();
  const lowerMessage = errorMessage.toLowerCase();
  
  // Network-related errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return NETWORK_ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (lowerMessage.includes('timeout')) {
    return NETWORK_ERROR_MESSAGES.TIMEOUT_ERROR;
  }
  
  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('server error')) {
    return NETWORK_ERROR_MESSAGES.SERVER_ERROR;
  }
  
  // Validation errors
  if (lowerMessage.includes('required') || lowerMessage.includes('invalid')) {
    return NETWORK_ERROR_MESSAGES.VALIDATION_ERROR;
  }
  
  // Duplicate errors
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    return NETWORK_ERROR_MESSAGES.DUPLICATE_ERROR;
  }
  
  // Conflict errors
  if (lowerMessage.includes('conflict') || lowerMessage.includes('overlap')) {
    return NETWORK_ERROR_MESSAGES.CONFLICT_ERROR;
  }
  
  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
    return NETWORK_ERROR_MESSAGES.PERMISSION_ERROR;
  }
  
  // Not found errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return NETWORK_ERROR_MESSAGES.NOT_FOUND_ERROR;
  }
  
  // Return the original message if it's user-friendly, otherwise use generic message
  if (errorMessage.length < 200 && !lowerMessage.includes('stack') && !lowerMessage.includes('error:')) {
    return errorMessage;
  }
  
  return NETWORK_ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Retry mechanism configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

/**
 * Implements exponential backoff retry logic
 */
export async function retryOperation(operation, config = RETRY_CONFIG) {
  let lastError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain types of errors
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('duplicate') || 
          errorMessage.includes('validation') || 
          errorMessage.includes('permission') ||
          errorMessage.includes('unauthorized')) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError;
}
