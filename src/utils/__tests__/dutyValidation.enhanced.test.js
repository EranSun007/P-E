import { vi } from 'vitest';
import {
  validateField,
  validateForm,
  categorizeErrors,
  parseApiError,
  retryOperation,
  sanitizeFormData,
  validateDateRange,
  validateBusinessRules
} from '../dutyValidation';

describe('Duty Validation - Enhanced Unit Tests', () => {
  describe('Field Validation', () => {
    describe('Team Member Validation', () => {
      it('should validate required team member', () => {
        expect(validateField('team_member_id', '', {})).toBe('Team member is required');
        expect(validateField('team_member_id', null, {})).toBe('Team member is required');
        expect(validateField('team_member_id', undefined, {})).toBe('Team member is required');
      });

      it('should accept valid team member ID', () => {
        expect(validateField('team_member_id', 'tm1', {})).toBe(null);
        expect(validateField('team_member_id', 'team_member_123', {})).toBe(null);
      });

      it('should validate team member ID format', () => {
        expect(validateField('team_member_id', '123', {})).toBe('Invalid team member ID format');
        expect(validateField('team_member_id', 'invalid-id', {})).toBe('Invalid team member ID format');
      });
    });

    describe('Duty Type Validation', () => {
      it('should validate required duty type', () => {
        expect(validateField('type', '', {})).toBe('Duty type is required');
        expect(validateField('type', null, {})).toBe('Duty type is required');
      });

      it('should accept valid duty types', () => {
        expect(validateField('type', 'devops', {})).toBe(null);
        expect(validateField('type', 'on_call', {})).toBe(null);
        expect(validateField('type', 'other', {})).toBe(null);
      });

      it('should reject invalid duty types', () => {
        expect(validateField('type', 'invalid_type', {})).toBe('Invalid duty type');
        expect(validateField('type', 'DEVOPS', {})).toBe('Invalid duty type');
      });
    });

    describe('Title Validation', () => {
      it('should validate required title', () => {
        expect(validateField('title', '', {})).toBe('Title is required');
        expect(validateField('title', '   ', {})).toBe('Title is required');
      });

      it('should validate title length', () => {
        const longTitle = 'a'.repeat(101);
        expect(validateField('title', longTitle, {})).toBe('Title must be under 100 characters');
      });

      it('should accept valid titles', () => {
        expect(validateField('title', 'DevOps', {})).toBe(null);
        expect(validateField('title', 'On-Call Support', {})).toBe(null);
        expect(validateField('title', 'a'.repeat(100), {})).toBe(null);
      });

      it('should sanitize title input', () => {
        expect(validateField('title', '  DevOps  ', {})).toBe(null);
        expect(validateField('title', 'DevOps\n\t', {})).toBe(null);
      });
    });

    describe('Description Validation', () => {
      it('should allow empty description', () => {
        expect(validateField('description', '', {})).toBe(null);
        expect(validateField('description', null, {})).toBe(null);
        expect(validateField('description', undefined, {})).toBe(null);
      });

      it('should validate description length', () => {
        const longDescription = 'a'.repeat(501);
        expect(validateField('description', longDescription, {})).toBe('Description must be under 500 characters');
      });

      it('should accept valid descriptions', () => {
        expect(validateField('description', 'Valid description', {})).toBe(null);
        expect(validateField('description', 'a'.repeat(500), {})).toBe(null);
      });

      it('should sanitize description input', () => {
        expect(validateField('description', '  Valid description  ', {})).toBe(null);
      });
    });

    describe('Date Validation', () => {
      it('should validate required start date', () => {
        expect(validateField('start_date', '', {})).toBe('Start date is required');
        expect(validateField('start_date', null, {})).toBe('Start date is required');
      });

      it('should validate required end date', () => {
        expect(validateField('end_date', '', {})).toBe('End date is required');
        expect(validateField('end_date', null, {})).toBe('End date is required');
      });

      it('should validate date format', () => {
        expect(validateField('start_date', 'invalid-date', {})).toBe('Invalid date format');
        expect(validateField('start_date', '2025-13-01', {})).toBe('Invalid date format');
        expect(validateField('start_date', '2025-01-32', {})).toBe('Invalid date format');
      });

      it('should accept valid dates', () => {
        expect(validateField('start_date', '2025-01-15', {})).toBe(null);
        expect(validateField('end_date', '2025-01-22', {})).toBe(null);
      });

      it('should validate date range constraints', () => {
        const pastDate = new Date();
        pastDate.setFullYear(pastDate.getFullYear() - 2);
        const pastDateString = pastDate.toISOString().split('T')[0];
        
        expect(validateField('start_date', pastDateString, {})).toBe('Start date cannot be more than 1 year in the past');
        
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 3);
        const futureDateString = futureDate.toISOString().split('T')[0];
        
        expect(validateField('end_date', futureDateString, {})).toBe('End date cannot be more than 2 years in the future');
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate complete form with all required fields', () => {
      const formData = {
        team_member_id: '',
        type: '',
        title: '',
        start_date: '',
        end_date: ''
      };

      const result = validateForm(formData);
      
      expect(result.errors).toEqual({
        team_member_id: 'Team member is required',
        type: 'Duty type is required',
        title: 'Title is required',
        start_date: 'Start date is required',
        end_date: 'End date is required'
      });
      
      expect(result.sanitizedData).toEqual({
        team_member_id: '',
        type: '',
        title: '',
        description: '',
        start_date: '',
        end_date: ''
      });
    });

    it('should validate form with valid data', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        description: 'Test description',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const result = validateForm(formData);
      
      expect(result.errors).toEqual({});
      expect(result.sanitizedData.team_member_id).toBe('tm1');
      expect(result.sanitizedData.type).toBe('devops');
      expect(result.sanitizedData.title).toBe('DevOps');
    });

    it('should perform cross-field validation', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-22',
        end_date: '2025-01-15' // End before start
      };

      const result = validateForm(formData);
      
      expect(result.errors.end_date).toBe('End date must be after start date');
    });

    it('should sanitize form data during validation', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'devops',
        title: '  DevOps  ',
        description: '  Test description  \n',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const result = validateForm(formData);
      
      expect(result.sanitizedData.title).toBe('DevOps');
      expect(result.sanitizedData.description).toBe('Test description');
    });
  });

  describe('Date Range Validation', () => {
    it('should validate valid date range', () => {
      const result = validateDateRange('2025-01-15', '2025-01-22');
      expect(result).toBe(null);
    });

    it('should detect invalid date range', () => {
      const result = validateDateRange('2025-01-22', '2025-01-15');
      expect(result).toBe('End date must be after start date');
    });

    it('should detect same day range', () => {
      const result = validateDateRange('2025-01-15', '2025-01-15');
      expect(result).toBe('End date must be after start date');
    });

    it('should validate maximum duration', () => {
      const startDate = '2025-01-01';
      const endDate = '2026-01-02'; // More than 1 year
      
      const result = validateDateRange(startDate, endDate);
      expect(result).toBe('Duty period cannot exceed 1 year');
    });

    it('should handle invalid date strings', () => {
      const result = validateDateRange('invalid', '2025-01-22');
      expect(result).toBe('Invalid date format');
    });
  });

  describe('Business Rules Validation', () => {
    it('should validate team member availability', () => {
      const formData = {
        team_member_id: 'tm1',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          start_date: '2025-01-20T00:00:00.000Z',
          end_date: '2025-01-25T00:00:00.000Z'
        }
      ];

      const result = validateBusinessRules(formData, existingDuties);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('date_overlap');
    });

    it('should allow non-overlapping duties', () => {
      const formData = {
        team_member_id: 'tm1',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          start_date: '2025-01-25T00:00:00.000Z',
          end_date: '2025-01-30T00:00:00.000Z'
        }
      ];

      const result = validateBusinessRules(formData, existingDuties);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should validate duty type constraints', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'on_call',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          type: 'on_call',
          start_date: '2025-01-10T00:00:00.000Z',
          end_date: '2025-01-17T00:00:00.000Z'
        }
      ];

      const result = validateBusinessRules(formData, existingDuties);
      expect(result.warnings).toContain('Multiple on-call duties in short period');
    });
  });

  describe('Error Categorization', () => {
    it('should categorize errors by severity', () => {
      const errors = {
        team_member_id: 'Team member is required',
        start_date: 'Invalid date format',
        description: 'Description too long',
        title: 'Title contains invalid characters'
      };

      const result = categorizeErrors(errors);
      
      expect(result.critical).toEqual({
        team_member_id: 'Team member is required'
      });
      
      expect(result.warnings).toEqual({
        start_date: 'Invalid date format',
        title: 'Title contains invalid characters'
      });
      
      expect(result.info).toEqual({
        description: 'Description too long'
      });
    });

    it('should handle empty errors object', () => {
      const result = categorizeErrors({});
      
      expect(result.critical).toEqual({});
      expect(result.warnings).toEqual({});
      expect(result.info).toEqual({});
    });
  });

  describe('API Error Parsing', () => {
    it('should parse network errors', () => {
      const error = new Error('Network request failed');
      error.code = 'NETWORK_ERROR';
      
      const result = parseApiError(error);
      expect(result).toBe('Network connection failed. Please check your internet connection and try again.');
    });

    it('should parse validation errors', () => {
      const error = new Error('Validation failed');
      error.response = {
        status: 400,
        data: {
          message: 'Invalid data provided',
          errors: {
            team_member_id: 'Required field'
          }
        }
      };
      
      const result = parseApiError(error);
      expect(result).toBe('Invalid data provided');
    });

    it('should parse duplicate errors', () => {
      const error = new Error('Duplicate entry');
      error.response = {
        status: 409,
        data: {
          message: 'Duplicate duty detected'
        }
      };
      
      const result = parseApiError(error);
      expect(result).toBe('A similar duty already exists. Please check existing duties or modify your entry.');
    });

    it('should parse server errors', () => {
      const error = new Error('Internal server error');
      error.response = {
        status: 500
      };
      
      const result = parseApiError(error);
      expect(result).toBe('Server error occurred. Please try again later or contact support.');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      
      const result = parseApiError(error);
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });

    it('should extract detailed error messages', () => {
      const error = new Error('API Error');
      error.response = {
        status: 422,
        data: {
          message: 'Validation failed',
          details: [
            'Team member is required',
            'Invalid date range'
          ]
        }
      };
      
      const result = parseApiError(error);
      expect(result).toBe('Validation failed: Team member is required, Invalid date range');
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize string fields', () => {
      const formData = {
        title: '  DevOps Duty  \n\t',
        description: '  Test description  ',
        team_member_id: 'tm1'
      };

      const result = sanitizeFormData(formData);
      
      expect(result.title).toBe('DevOps Duty');
      expect(result.description).toBe('Test description');
      expect(result.team_member_id).toBe('tm1');
    });

    it('should handle null and undefined values', () => {
      const formData = {
        title: 'DevOps',
        description: null,
        notes: undefined
      };

      const result = sanitizeFormData(formData);
      
      expect(result.title).toBe('DevOps');
      expect(result.description).toBe('');
      expect(result.notes).toBe('');
    });

    it('should preserve date formats', () => {
      const formData = {
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const result = sanitizeFormData(formData);
      
      expect(result.start_date).toBe('2025-01-15');
      expect(result.end_date).toBe('2025-01-22');
    });

    it('should remove XSS attempts', () => {
      const formData = {
        title: '<script>alert("xss")</script>DevOps',
        description: 'Test<img src="x" onerror="alert(1)">description'
      };

      const result = sanitizeFormData(formData);
      
      expect(result.title).toBe('DevOps');
      expect(result.description).toBe('Testdescription');
    });
  });

  describe('Retry Operation', () => {
    it('should retry operation with exponential backoff', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const result = await retryOperation(mockOperation, 3, 100);
      
      expect(result).toEqual({ success: true });
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(retryOperation(mockOperation, 2, 100)).rejects.toThrow('Persistent error');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const validationError = new Error('Validation failed');
      validationError.code = 'VALIDATION_ERROR';
      
      const mockOperation = vi.fn().mockRejectedValue(validationError);

      await expect(retryOperation(mockOperation, 3, 100)).rejects.toThrow('Validation failed');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry condition', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Custom error'));
      const customRetryCondition = (error) => error.message === 'Custom error';

      await expect(retryOperation(mockOperation, 2, 100, customRetryCondition)).rejects.toThrow('Custom error');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete validation workflow', () => {
      const formData = {
        team_member_id: '  tm1  ',
        type: 'devops',
        title: '  DevOps Duty  ',
        description: '  Test description  \n',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      // Sanitize data
      const sanitized = sanitizeFormData(formData);
      
      // Validate form
      const validation = validateForm(sanitized);
      
      // Categorize any errors
      const categorized = categorizeErrors(validation.errors);
      
      expect(validation.errors).toEqual({});
      expect(categorized.critical).toEqual({});
      expect(sanitized.title).toBe('DevOps Duty');
      expect(sanitized.description).toBe('Test description');
    });

    it('should handle validation with business rule conflicts', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-01-15',
        end_date: '2025-01-22'
      };

      const existingDuties = [
        {
          id: 'duty1',
          team_member_id: 'tm1',
          start_date: '2025-01-20T00:00:00.000Z',
          end_date: '2025-01-25T00:00:00.000Z'
        }
      ];

      // Basic validation
      const validation = validateForm(formData);
      expect(validation.errors).toEqual({});
      
      // Business rules validation
      const businessRules = validateBusinessRules(formData, existingDuties);
      expect(businessRules.conflicts).toHaveLength(1);
      
      // Should prevent submission due to conflicts
      const hasConflicts = businessRules.conflicts.length > 0;
      expect(hasConflicts).toBe(true);
    });
  });
});