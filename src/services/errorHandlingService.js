/**
 * ErrorHandlingService - Comprehensive error handling and user feedback service
 * 
 * This service provides:
 * - Standardized error handling patterns
 * - User-friendly error messages and recovery suggestions
 * - Loading states and progress indicators
 * - Success notifications
 * - Retry logic with exponential backoff
 * - Error categorization and reporting
 */

import { toast } from '@/components/ui/use-toast';

/**
 * Custom error classes for different types of errors
 */
export class CalendarError extends Error {
  constructor(message, code, originalError = null, context = {}) {
    super(message);
    this.name = 'CalendarError';
    this.code = code;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends CalendarError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class NetworkError extends CalendarError {
  constructor(message, operation = null, originalError = null) {
    super(message, 'NETWORK_ERROR', originalError);
    this.name = 'NetworkError';
    this.operation = operation;
    this.isRetryable = true;
  }
}

export class DataError extends CalendarError {
  constructor(message, entityType = null, entityId = null, originalError = null) {
    super(message, 'DATA_ERROR', originalError);
    this.name = 'DataError';
    this.entityType = entityType;
    this.entityId = entityId;
    this.isRetryable = false;
  }
}

export class SynchronizationError extends CalendarError {
  constructor(message, syncType = null, originalError = null) {
    super(message, 'SYNC_ERROR', originalError);
    this.name = 'SynchronizationError';
    this.syncType = syncType;
    this.isRetryable = true;
  }
}

/**
 * Error handling service with comprehensive user feedback
 */
export class ErrorHandlingService {
  // Error severity levels
  static SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  // Error categories for better handling
  static CATEGORIES = {
    VALIDATION: 'validation',
    NETWORK: 'network',
    DATA: 'data',
    SYNC: 'synchronization',
    PERMISSION: 'permission',
    UNKNOWN: 'unknown'
  };

  // Retry configuration
  static RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 1.5
  };

  /**
   * Handle errors with appropriate user feedback and recovery options
   * @param {Error} error - The error to handle
   * @param {Object} options - Handling options
   * @returns {Object} Error handling result
   */
  static handleError(error, options = {}) {
    const {
      operation = 'operation',
      showToast = true,
      logError = true,
      context = {},
      severity = ErrorHandlingService.SEVERITY.MEDIUM,
      category = null
    } = options;

    // Categorize the error
    const errorCategory = category || ErrorHandlingService.categorizeError(error);
    const errorInfo = ErrorHandlingService.getErrorInfo(error, errorCategory);

    // Log the error if requested
    if (logError) {
      ErrorHandlingService.logError(error, {
        operation,
        context,
        severity,
        category: errorCategory
      });
    }

    // Show user-friendly toast notification
    if (showToast) {
      ErrorHandlingService.showErrorToast(errorInfo, {
        operation,
        severity,
        context
      });
    }

    return {
      error,
      category: errorCategory,
      severity,
      userMessage: errorInfo.userMessage,
      technicalMessage: errorInfo.technicalMessage,
      suggestions: errorInfo.suggestions,
      isRetryable: errorInfo.isRetryable,
      context: {
        ...context,
        operation,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Categorize errors for appropriate handling
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  static categorizeError(error) {
    if (error instanceof ValidationError) {
      return ErrorHandlingService.CATEGORIES.VALIDATION;
    }
    if (error instanceof NetworkError) {
      return ErrorHandlingService.CATEGORIES.NETWORK;
    }
    if (error instanceof DataError) {
      return ErrorHandlingService.CATEGORIES.DATA;
    }
    if (error instanceof SynchronizationError) {
      return ErrorHandlingService.CATEGORIES.SYNC;
    }
    
    // Check error message patterns for categorization
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorHandlingService.CATEGORIES.NETWORK;
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorHandlingService.CATEGORIES.VALIDATION;
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorHandlingService.CATEGORIES.PERMISSION;
    }
    if (message.includes('sync') || message.includes('synchroniz')) {
      return ErrorHandlingService.CATEGORIES.SYNC;
    }
    
    return ErrorHandlingService.CATEGORIES.UNKNOWN;
  }

  /**
   * Get user-friendly error information
   * @param {Error} error - Error to process
   * @param {string} category - Error category
   * @returns {Object} Error information
   */
  static getErrorInfo(error, category) {
    const baseInfo = {
      technicalMessage: error.message,
      isRetryable: false,
      suggestions: []
    };

    switch (category) {
      case ErrorHandlingService.CATEGORIES.VALIDATION:
        return {
          ...baseInfo,
          userMessage: 'Please check your input and try again',
          suggestions: [
            'Verify all required fields are filled',
            'Check date formats and ranges',
            'Ensure data meets validation requirements'
          ]
        };

      case ErrorHandlingService.CATEGORIES.NETWORK:
        return {
          ...baseInfo,
          userMessage: 'Connection issue occurred. Please try again.',
          isRetryable: true,
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Wait a moment and retry the operation'
          ]
        };

      case ErrorHandlingService.CATEGORIES.DATA:
        return {
          ...baseInfo,
          userMessage: 'Data issue encountered. Some information may be missing.',
          suggestions: [
            'Try refreshing the calendar data',
            'Check if related records exist',
            'Contact support if the issue persists'
          ]
        };

      case ErrorHandlingService.CATEGORIES.SYNC:
        return {
          ...baseInfo,
          userMessage: 'Synchronization failed. Calendar data may be outdated.',
          isRetryable: true,
          suggestions: [
            'Try manual sync from the calendar toolbar',
            'Refresh the page to reload data',
            'Check for conflicting calendar events'
          ]
        };

      case ErrorHandlingService.CATEGORIES.PERMISSION:
        return {
          ...baseInfo,
          userMessage: 'Permission denied. You may not have access to this feature.',
          suggestions: [
            'Check your user permissions',
            'Contact your administrator',
            'Try logging out and back in'
          ]
        };

      default:
        return {
          ...baseInfo,
          userMessage: 'An unexpected error occurred. Please try again.',
          isRetryable: true,
          suggestions: [
            'Try refreshing the page',
            'Wait a moment and retry',
            'Contact support if the issue continues'
          ]
        };
    }
  }

  /**
   * Show user-friendly error toast notification
   * @param {Object} errorInfo - Error information
   * @param {Object} options - Toast options
   */
  static showErrorToast(errorInfo, options = {}) {
    const { operation, severity, context } = options;
    
    const title = ErrorHandlingService.getErrorTitle(severity, operation);
    const description = ErrorHandlingService.getErrorDescription(errorInfo, context);

    toast({
      variant: 'destructive',
      title,
      description,
      duration: severity === ErrorHandlingService.SEVERITY.CRITICAL ? 0 : 5000, // Critical errors don't auto-dismiss
    });
  }

  /**
   * Get appropriate error title based on severity and operation
   * @param {string} severity - Error severity
   * @param {string} operation - Operation that failed
   * @returns {string} Error title
   */
  static getErrorTitle(severity, operation) {
    switch (severity) {
      case ErrorHandlingService.SEVERITY.CRITICAL:
        return 'Critical Error';
      case ErrorHandlingService.SEVERITY.HIGH:
        return 'Error';
      case ErrorHandlingService.SEVERITY.MEDIUM:
        return `${operation} Failed`;
      case ErrorHandlingService.SEVERITY.LOW:
        return 'Warning';
      default:
        return 'Error';
    }
  }

  /**
   * Get error description for toast notification
   * @param {Object} errorInfo - Error information
   * @param {Object} context - Additional context
   * @returns {string} Error description
   */
  static getErrorDescription(errorInfo, context) {
    let description = errorInfo.userMessage;
    
    if (errorInfo.suggestions.length > 0) {
      description += '\n\nSuggestions:\n• ' + errorInfo.suggestions.slice(0, 2).join('\n• ');
    }
    
    return description;
  }

  /**
   * Log error with structured information
   * @param {Error} error - Error to log
   * @param {Object} options - Logging options
   */
  static logError(error, options = {}) {
    const {
      operation,
      context,
      severity,
      category
    } = options;

    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      category,
      severity,
      message: error.message,
      stack: error.stack,
      context,
      errorType: error.constructor.name
    };

    // Use appropriate console method based on severity
    switch (severity) {
      case ErrorHandlingService.SEVERITY.CRITICAL:
        console.error('CRITICAL ERROR:', logEntry);
        break;
      case ErrorHandlingService.SEVERITY.HIGH:
        console.error('ERROR:', logEntry);
        break;
      case ErrorHandlingService.SEVERITY.MEDIUM:
        console.warn('WARNING:', logEntry);
        break;
      case ErrorHandlingService.SEVERITY.LOW:
        console.info('INFO:', logEntry);
        break;
      default:
        console.error('ERROR:', logEntry);
    }
  }

  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Operation result
   */
  static async retryOperation(operation, options = {}) {
    const {
      maxRetries = ErrorHandlingService.RETRY_CONFIG.maxRetries,
      baseDelay = ErrorHandlingService.RETRY_CONFIG.baseDelay,
      maxDelay = ErrorHandlingService.RETRY_CONFIG.maxDelay,
      backoffMultiplier = ErrorHandlingService.RETRY_CONFIG.backoffMultiplier,
      operationName = 'operation',
      onRetry = null,
      shouldRetry = null
    } = options;

    let lastError;
    let delay = baseDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log success if it took multiple attempts
        if (attempt > 1) {
          console.log(`${operationName} succeeded on attempt ${attempt}/${maxRetries}`);
          
          // Show success toast for recovered operations
          toast({
            title: 'Operation Recovered',
            description: `${operationName} succeeded after ${attempt} attempts`,
            variant: 'default',
            duration: 3000
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        const errorCategory = ErrorHandlingService.categorizeError(error);
        const errorInfo = ErrorHandlingService.getErrorInfo(error, errorCategory);
        
        const shouldRetryError = shouldRetry ? 
          shouldRetry(error, attempt) : 
          errorInfo.isRetryable;

        if (!shouldRetryError) {
          // Don't retry, throw original error immediately
          throw error;
        }

        if (attempt >= maxRetries) {
          break;
        }

        // Log retry attempt
        console.warn(`${operationName} failed on attempt ${attempt}/${maxRetries}: ${error.message}. Retrying in ${delay}ms...`);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(error, attempt, delay);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase delay for next attempt (exponential backoff)
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    // All retries failed
    const finalError = new NetworkError(
      `${operationName} failed after ${maxRetries} attempts: ${lastError.message}`,
      operationName,
      lastError
    );

    // Handle the final error
    ErrorHandlingService.handleError(finalError, {
      operation: operationName,
      severity: ErrorHandlingService.SEVERITY.HIGH,
      context: { attempts: maxRetries, lastError: lastError.message }
    });

    throw finalError;
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   * @param {Object} options - Notification options
   */
  static showSuccess(message, options = {}) {
    const {
      title = 'Success',
      duration = 3000,
      description = null
    } = options;

    toast({
      title,
      description: description || message,
      variant: 'default',
      duration
    });
  }

  /**
   * Show loading state with progress indication
   * @param {string} operation - Operation being performed
   * @param {Object} options - Loading options
   * @returns {Function} Function to update/dismiss loading state
   */
  static showLoading(operation, options = {}) {
    const {
      showProgress = false,
      estimatedDuration = null
    } = options;

    let loadingToast;
    let progressInterval;

    const startLoading = () => {
      loadingToast = toast({
        title: 'Loading...',
        description: `${operation} in progress...`,
        duration: 0, // Don't auto-dismiss
        variant: 'default'
      });

      if (showProgress && estimatedDuration) {
        let progress = 0;
        const progressStep = 100 / (estimatedDuration / 1000); // Progress per second
        
        progressInterval = setInterval(() => {
          progress = Math.min(progress + progressStep, 95); // Cap at 95% until completion
          
          if (loadingToast) {
            loadingToast.update({
              description: `${operation} in progress... ${Math.round(progress)}%`
            });
          }
        }, 1000);
      }
    };

    const updateLoading = (newMessage, progress = null) => {
      if (loadingToast) {
        const description = progress !== null ? 
          `${newMessage} ${Math.round(progress)}%` : 
          newMessage;
          
        loadingToast.update({
          description
        });
      }
    };

    const dismissLoading = (success = true, finalMessage = null) => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      if (loadingToast) {
        if (success && finalMessage) {
          loadingToast.update({
            title: 'Completed',
            description: finalMessage,
            variant: 'default'
          });
          
          // Auto-dismiss success message after 2 seconds
          setTimeout(() => {
            if (loadingToast) {
              loadingToast.dismiss();
            }
          }, 2000);
        } else {
          loadingToast.dismiss();
        }
      }
    };

    // Start loading immediately
    startLoading();

    return {
      update: updateLoading,
      dismiss: dismissLoading
    };
  }

  /**
   * Wrap an async operation with comprehensive error handling
   * @param {Function} operation - Async operation to wrap
   * @param {Object} options - Wrapping options
   * @returns {Promise} Wrapped operation result
   */
  static async wrapOperation(operation, options = {}) {
    const {
      operationName = 'operation',
      showLoading = false,
      showSuccess = false,
      successMessage = `${operationName} completed successfully`,
      retryOptions = {},
      errorOptions = {}
    } = options;

    let loadingController;

    try {
      // Show loading state if requested
      if (showLoading) {
        loadingController = ErrorHandlingService.showLoading(operationName, {
          showProgress: retryOptions.maxRetries > 1,
          estimatedDuration: retryOptions.maxRetries * retryOptions.baseDelay || 3000
        });
      }

      // Execute operation with retry logic if configured
      const result = retryOptions.maxRetries > 0 ? 
        await ErrorHandlingService.retryOperation(operation, {
          ...retryOptions,
          operationName,
          onRetry: (error, attempt, delay) => {
            if (loadingController) {
              loadingController.update(`Retrying ${operationName}... (attempt ${attempt})`);
            }
          }
        }) :
        await operation();

      // Show success notification if requested
      if (showSuccess) {
        ErrorHandlingService.showSuccess(successMessage);
      }

      // Dismiss loading state
      if (loadingController) {
        loadingController.dismiss(true, showSuccess ? null : successMessage);
      }

      return result;
    } catch (error) {
      // Dismiss loading state on error
      if (loadingController) {
        loadingController.dismiss(false);
      }

      // Handle the error
      const errorResult = ErrorHandlingService.handleError(error, {
        operation: operationName,
        ...errorOptions
      });

      // Re-throw the error for caller handling
      throw error;
    }
  }

  /**
   * Create a recovery action for failed operations
   * @param {Function} recoveryAction - Recovery function
   * @param {string} actionLabel - Label for the recovery action
   * @returns {Object} Recovery action object
   */
  static createRecoveryAction(recoveryAction, actionLabel = 'Retry') {
    return {
      label: actionLabel,
      action: recoveryAction
    };
  }

  /**
   * Validate operation parameters and throw appropriate errors
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - Validation schema
   * @throws {ValidationError} If validation fails
   */
  static validateParams(params, schema) {
    for (const [key, rules] of Object.entries(schema)) {
      const value = params[key];

      if (rules.required && (value === undefined || value === null || value === '')) {
        throw new ValidationError(`${key} is required`, key, value);
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          throw new ValidationError(`${key} must be of type ${rules.type}`, key, value);
        }

        if (rules.minLength && value.length < rules.minLength) {
          throw new ValidationError(`${key} must be at least ${rules.minLength} characters`, key, value);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          throw new ValidationError(`${key} must be no more than ${rules.maxLength} characters`, key, value);
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          throw new ValidationError(`${key} format is invalid`, key, value);
        }

        if (rules.custom && !rules.custom(value)) {
          throw new ValidationError(rules.customMessage || `${key} is invalid`, key, value);
        }
      }
    }
  }
}

// Export error handling service as default
export default ErrorHandlingService;