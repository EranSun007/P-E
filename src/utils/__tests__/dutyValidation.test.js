import { 
  validateField, 
  validateForm, 
  validateBusinessRules,
  categorizeErrors,
  parseApiError,
  retryOperation,
  NETWORK_ERROR_MESSAGES 
} from '../dutyValidation.js';

describe('dutyValidation utilities', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      expect(validateField('team_member_id', '')).toBe('Team member is required');
      expect(validateField('team_member_id', null)).toBe('Team member is required');
      expect(validateField('team_member_id', 'tm1')).toBe(null);
    });

    it('should validate duty type', () => {
      expect(validateField('type', 'invalid_type')).toBe('Duty type is required'); // Sanitized to null, triggers required validation
      expect(validateField('type', 'devops')).toBe(null);
      expect(validateField('type', 'on_call')).toBe(null);
      expect(validateField('type', 'other')).toBe(null);
    });

    it('should validate duty title', () => {
      expect(validateField('title', 'Invalid Title')).toBe('Title is required'); // Sanitized to null, triggers required validation
      expect(validateField('title', 'Reporting')).toBe(null);
      expect(validateField('title', 'Metering')).toBe(null);
      expect(validateField('title', 'DevOps')).toBe(null);
    });

    it('should validate description length', () => {
      const longDescription = 'a'.repeat(501);
      expect(validateField('description', longDescription)).toBe(null); // Sanitized to 500 chars, so it's valid
      expect(validateField('description', 'Valid description')).toBe(null);
    });

    it('should validate start date', () => {
      expect(validateField('start_date', '')).toBe('Start date is required');
      expect(validateField('start_date', 'invalid-date')).toBe('Start date is required'); // Sanitized to null, triggers required validation
      
      // Date too far in the past
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      expect(validateField('start_date', twoYearsAgo.toISOString().split('T')[0]))
        .toBe('Start date cannot be more than 1 year in the past');
      
      // Date too far in the future
      const threeYearsFromNow = new Date();
      threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);
      expect(validateField('start_date', threeYearsFromNow.toISOString().split('T')[0]))
        .toBe('Start date cannot be more than 2 years in the future');
      
      // Valid date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validateField('start_date', tomorrow.toISOString().split('T')[0])).toBe(null);
    });

    it('should validate end date', () => {
      expect(validateField('end_date', '')).toBe('End date is required');
      expect(validateField('end_date', 'invalid-date')).toBe('End date is required'); // Sanitized to null, triggers required validation
      
      // Valid date
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      expect(validateField('end_date', nextWeek.toISOString().split('T')[0])).toBe(null);
    });

    it('should validate cross-field date relationships', () => {
      const formData = {
        start_date: '2024-12-10',
        end_date: '2024-12-05'
      };
      
      expect(validateField('start_date', '2024-12-10', formData))
        .toBe('Start date must be before end date');
      expect(validateField('end_date', '2024-12-05', formData))
        .toBe('End date must be after start date');
    });

    it('should validate duty period length', () => {
      const formData = {
        start_date: '2024-01-01',
        end_date: '2025-12-31'
      };
      
      expect(validateField('end_date', '2025-12-31', formData))
        .toBe('Duty period cannot exceed 1 year');
    });

    it('should validate minimum duty period', () => {
      const formData = {
        start_date: '2024-12-01',
        end_date: '2024-12-01'
      };
      
      expect(validateField('end_date', '2024-12-01', formData))
        .toBe('Duty period must be at least 1 day');
    });
  });

  describe('validateForm', () => {
    it('should validate complete form data', () => {
      const invalidFormData = {
        team_member_id: '',
        type: '',
        title: '',
        description: '',
        start_date: '',
        end_date: ''
      };
      
      const result = validateForm(invalidFormData);
      const errors = result.errors;
      
      expect(errors.team_member_id).toBe('Team member is required');
      expect(errors.type).toBe('Duty type is required');
      expect(errors.title).toBe('Title is required');
      expect(errors.start_date).toBe('Start date is required');
      expect(errors.end_date).toBe('End date is required');
    });

    it('should return no errors for valid form data', () => {
      const validFormData = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        description: 'Valid description',
        start_date: '2024-12-01',
        end_date: '2024-12-07'
      };
      
      const result = validateForm(validFormData);
      const errors = result.errors;
      
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('validateBusinessRules', () => {
    it('should warn about weekend on-call duties', () => {
      const formData = {
        start_date: '2024-12-07', // Saturday
        type: 'on_call'
      };
      
      const errors = validateBusinessRules(formData);
      
      expect(errors._warnings).toContain('On-call duties starting on weekends may require additional approval');
    });

    it('should warn about holiday periods', () => {
      const formData = {
        start_date: '2024-12-20',
        end_date: '2024-12-30' // Includes Christmas
      };
      
      const errors = validateBusinessRules(formData);
      
      expect(errors._warnings).toContain('This duty period includes major holidays. Please ensure adequate coverage.');
    });
  });

  describe('categorizeErrors', () => {
    it('should categorize errors by severity', () => {
      const errors = {
        team_member_id: 'Team member is required',
        description: 'Description too long',
        _warnings: ['Weekend duty warning']
      };
      
      const categorized = categorizeErrors(errors);
      
      expect(categorized.critical.team_member_id).toBe('Team member is required');
      expect(categorized.warnings.description).toBe('Description too long');
      expect(categorized.warnings._general).toContain('Weekend duty warning');
    });
  });

  describe('parseApiError', () => {
    it('should parse network errors', () => {
      const networkError = new Error('Network request failed');
      expect(parseApiError(networkError)).toBe(NETWORK_ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('should parse timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      expect(parseApiError(timeoutError)).toBe(NETWORK_ERROR_MESSAGES.TIMEOUT_ERROR);
    });

    it('should parse server errors', () => {
      const serverError = new Error('500 Internal Server Error');
      expect(parseApiError(serverError)).toBe(NETWORK_ERROR_MESSAGES.SERVER_ERROR);
    });

    it('should parse validation errors', () => {
      const validationError = new Error('Invalid field value');
      expect(parseApiError(validationError)).toBe(NETWORK_ERROR_MESSAGES.VALIDATION_ERROR);
    });

    it('should parse duplicate errors', () => {
      const duplicateError = new Error('Duplicate entry detected');
      expect(parseApiError(duplicateError)).toBe(NETWORK_ERROR_MESSAGES.DUPLICATE_ERROR);
    });

    it('should parse conflict errors', () => {
      const conflictError = new Error('Duty conflicts with existing assignment');
      expect(parseApiError(conflictError)).toBe(NETWORK_ERROR_MESSAGES.CONFLICT_ERROR);
    });

    it('should return user-friendly message for short errors', () => {
      const shortError = new Error('User-friendly error message');
      expect(parseApiError(shortError)).toBe('User-friendly error message');
    });

    it('should return generic message for complex errors', () => {
      const complexError = new Error('Error: Complex stack trace with lots of technical details...');
      expect(parseApiError(complexError)).toBe(NETWORK_ERROR_MESSAGES.UNKNOWN_ERROR);
    });
  });

  describe('retryOperation', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return Promise.resolve('success');
      });

      const result = await retryOperation(operation, { maxRetries: 3, baseDelay: 10 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Duplicate entry'));
      
      await expect(retryOperation(operation)).rejects.toThrow('Duplicate entry');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry validation errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Validation failed'));
      
      await expect(retryOperation(operation)).rejects.toThrow('Validation failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry permission errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Permission denied'));
      
      await expect(retryOperation(operation)).rejects.toThrow('Permission denied');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw last error after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(retryOperation(operation, { maxRetries: 2, baseDelay: 10 }))
        .rejects.toThrow('Network error');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});