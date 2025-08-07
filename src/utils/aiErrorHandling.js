/**
 * AI Error Handling Utilities
 * Provides comprehensive error handling for SAP AI Core integration
 */

/**
 * Custom error classes for AI operations
 */
export class AIServiceError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class AIAuthenticationError extends AIServiceError {
  constructor(message = 'Authentication failed', details = {}) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AIAuthenticationError';
  }
}

export class AIRateLimitError extends AIServiceError {
  constructor(message = 'Rate limit exceeded', details = {}) {
    super(message, 'RATE_LIMIT', details);
    this.name = 'AIRateLimitError';
    this.retryAfter = details.retryAfter || 60; // seconds
  }
}

export class AIModelUnavailableError extends AIServiceError {
  constructor(model, message = 'Model is currently unavailable', details = {}) {
    super(message, 'MODEL_UNAVAILABLE', { ...details, model });
    this.name = 'AIModelUnavailableError';
    this.model = model;
  }
}

export class AIValidationError extends AIServiceError {
  constructor(message = 'AI response validation failed', details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'AIValidationError';
  }
}

export class AITimeoutError extends AIServiceError {
  constructor(message = 'AI service request timed out', details = {}) {
    super(message, 'TIMEOUT', details);
    this.name = 'AITimeoutError';
  }
}

/**
 * Error handler for AI operations
 * Provides consistent error handling and user-friendly messages
 */
export class AIErrorHandler {
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    this.logLevel = options.logLevel || 'error';
    this.fallbackEnabled = options.fallbackEnabled !== false;
  }

  /**
   * Handle AI service errors and return user-friendly response
   */
  handleError(error, context = {}) {
    const errorInfo = this.categorizeError(error);
    
    if (this.enableLogging) {
      this.logError(error, context, errorInfo);
    }

    return {
      success: false,
      error: errorInfo.userMessage,
      code: errorInfo.code,
      canRetry: errorInfo.canRetry,
      retryAfter: errorInfo.retryAfter,
      fallbackAvailable: this.fallbackEnabled && errorInfo.canFallback,
      details: this.enableLogging ? errorInfo.details : undefined
    };
  }

  /**
   * Categorize error and determine appropriate response
   */
  categorizeError(error) {
    if (error instanceof AIAuthenticationError) {
      return {
        code: 'AUTH_ERROR',
        userMessage: 'Unable to authenticate with AI service. Please check your credentials.',
        canRetry: false,
        canFallback: false,
        details: error.details
      };
    }

    if (error instanceof AIRateLimitError) {
      return {
        code: 'RATE_LIMIT',
        userMessage: `AI service is temporarily busy. Please try again in ${error.retryAfter} seconds.`,
        canRetry: true,
        retryAfter: error.retryAfter,
        canFallback: true,
        details: error.details
      };
    }

    if (error instanceof AIModelUnavailableError) {
      return {
        code: 'MODEL_UNAVAILABLE',
        userMessage: `The selected AI model (${error.model}) is currently unavailable. Try switching to a different model.`,
        canRetry: true,
        canFallback: true,
        details: error.details
      };
    }

    if (error instanceof AIValidationError) {
      return {
        code: 'VALIDATION_ERROR',
        userMessage: 'AI service returned an unexpected response. Please try again.',
        canRetry: true,
        canFallback: true,
        details: error.details
      };
    }

    if (error instanceof AITimeoutError) {
      return {
        code: 'TIMEOUT',
        userMessage: 'AI service is taking too long to respond. Please try again.',
        canRetry: true,
        canFallback: true,
        details: error.details
      };
    }

    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return {
        code: 'NETWORK_ERROR',
        userMessage: 'Unable to connect to AI service. Please check your internet connection.',
        canRetry: true,
        canFallback: true,
        details: { originalError: error.message }
      };
    }

    // Generic AI service errors
    if (error instanceof AIServiceError) {
      return {
        code: error.code || 'AI_ERROR',
        userMessage: error.message || 'An error occurred with the AI service.',
        canRetry: true,
        canFallback: true,
        details: error.details
      };
    }

    // Unknown errors
    return {
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
      canRetry: true,
      canFallback: true,
      details: { originalError: error.message, stack: error.stack }
    };
  }

  /**
   * Log error with appropriate level and context
   */
  logError(error, context, errorInfo) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context,
      errorInfo,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };

    if (this.logLevel === 'debug' || error instanceof AIAuthenticationError) {
      console.error('AI Service Error:', logData);
    } else if (this.logLevel === 'warn' && errorInfo.canRetry) {
      console.warn('AI Service Warning:', logData);
    } else {
      console.error('AI Service Error:', error.message, { context, code: errorInfo.code });
    }
  }
}

/**
 * Retry logic for AI operations
 */
export class AIRetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // milliseconds
    this.maxDelay = options.maxDelay || 10000; // milliseconds
    this.backoffFactor = options.backoffFactor || 2;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if not first attempt
        if (attempt > 0) {
          console.log(`AI operation succeeded on attempt ${attempt + 1}`, context);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (error instanceof AIAuthenticationError || 
            error instanceof AIValidationError ||
            (error instanceof AIModelUnavailableError && attempt >= 1)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(this.backoffFactor, attempt),
          this.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        console.warn(`AI operation failed on attempt ${attempt + 1}, retrying in ${Math.round(jitteredDelay)}ms`, {
          error: error.message,
          context
        });

        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    if (error instanceof AIAuthenticationError || 
        error instanceof AIValidationError) {
      return false;
    }

    if (error instanceof AIRateLimitError ||
        error instanceof AITimeoutError ||
        error instanceof AIModelUnavailableError) {
      return true;
    }

    // Network errors are generally retryable
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return true;
    }

    return true; // Default to retryable for unknown errors
  }
}

/**
 * Circuit breaker for AI services
 * Prevents cascading failures by temporarily disabling failing services
 */
export class AICircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // milliseconds
    this.monitoringPeriod = options.monitoringPeriod || 300000; // 5 minutes
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute(operation, context = {}) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new AIServiceError(
          'AI service is temporarily unavailable due to repeated failures',
          'CIRCUIT_BREAKER_OPEN',
          { state: this.state, failureCount: this.failureCount }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to fully recover
        this.state = 'CLOSED';
        console.log('AI Circuit breaker recovered to CLOSED state');
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`AI Circuit breaker opened due to ${this.failureCount} failures`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.state === 'CLOSED'
    };
  }
}

// Create default instances
export const defaultErrorHandler = new AIErrorHandler();
export const defaultRetryHandler = new AIRetryHandler();
export const defaultCircuitBreaker = new AICircuitBreaker();

/**
 * Utility function to handle AI operations with full error handling
 */
export async function executeAIOperation(operation, options = {}) {
  const errorHandler = options.errorHandler || defaultErrorHandler;
  const retryHandler = options.retryHandler || defaultRetryHandler;
  const circuitBreaker = options.circuitBreaker || defaultCircuitBreaker;
  const context = options.context || {};

  try {
    return await circuitBreaker.execute(async () => {
      return await retryHandler.executeWithRetry(operation, context);
    }, context);
  } catch (error) {
    return errorHandler.handleError(error, context);
  }
}
