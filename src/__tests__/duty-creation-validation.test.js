/**
 * Comprehensive tests for duty creation functionality
 * Tests validation, business rules, calendar integration, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localClient } from '../api/localClient';
import { validateForm, sanitizeFormData, parseApiError } from '../utils/dutyValidation';

// Mock localStorage
const mockLocalStorage = {
  data: {},
  getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage.data[key] = value;
  }),
  clear: vi.fn(() => {
    mockLocalStorage.data = {};
  })
};

// Mock console methods to avoid test noise
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

beforeEach(() => {
  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  // Mock console methods
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  
  // Clear localStorage before each test
  mockLocalStorage.clear();
  
  // Setup initial test data
  const testTeamMembers = [
    { id: 'tm1', name: 'John Doe', email: 'john@example.com' },
    { id: 'tm2', name: 'Jane Smith', email: 'jane@example.com' }
  ];
  
  const testDuties = [
    {
      id: 'duty1',
      team_member_id: 'tm1',
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-08-12',
      end_date: '2025-08-16',
      description: 'Existing on-call duty',
      created_date: '2025-08-01T10:00:00.000Z'
    },
    {
      id: 'duty2',
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-08-23',
      end_date: '2025-08-30',
      description: 'Existing DevOps duty',
      created_date: '2025-08-01T10:00:00.000Z'
    }
  ];
  
  mockLocalStorage.setItem('team_members', JSON.stringify(testTeamMembers));
  mockLocalStorage.setItem('duties', JSON.stringify(testDuties));
  mockLocalStorage.setItem('calendar_events', JSON.stringify([]));
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  
  // Clear all mocks
  vi.clearAllMocks();
});

describe('Duty Creation Validation Tests', () => {
  describe('Form Validation', () => {
    it('should validate required fields', () => {
      const formData = {
        team_member_id: '',
        type: '',
        title: '',
        start_date: '',
        end_date: ''
      };
      
      const result = validateForm(formData);
      
      expect(result.errors.team_member_id).toBe('Team member is required');
      expect(result.errors.type).toBe('Duty type is required');
      expect(result.errors.title).toBe('Title is required');
      expect(result.errors.start_date).toBe('Start date is required');
      expect(result.errors.end_date).toBe('End date is required');
    });
    
    it('should validate valid form data', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-09-01',
        end_date: '2025-09-05',
        description: 'Test duty'
      };
      
      const result = validateForm(formData);
      
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
    });
    
    it('should validate date range', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-09-05',
        end_date: '2025-09-01', // End before start
        description: 'Test duty'
      };
      
      const result = validateForm(formData);
      
      expect(result.errors.end_date).toBe('End date must be after start date');
    });
    
    it('should handle weekend duty warnings', () => {
      const formData = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-17', // Sunday
        end_date: '2025-08-20',
        description: 'Weekend duty'
      };
      
      const result = validateForm(formData);
      
      // Should have warnings but not block validation
      expect(result.errors._warnings).toBeDefined();
      expect(result.errors._warnings).toContain('On-call duties starting on weekends may require additional approval');
    });
  });
  
  describe('Data Sanitization', () => {
    it('should sanitize form data', () => {
      const formData = {
        team_member_id: 'tm1<script>alert("xss")</script>',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-09-01',
        end_date: '2025-09-05',
        description: '<script>alert("xss")</script>Test description'
      };
      
      const sanitized = sanitizeFormData(formData);
      
      expect(sanitized.team_member_id).toBe('tm1scriptalertxssscript');
      expect(sanitized.description).toBe('alert(xss)Test description');
    });
  });
});

describe('Duty Business Rules Tests', () => {
  describe('Conflict Detection', () => {
    it('should detect overlapping duties of same type', async () => {
      const conflictingDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-14', // Overlaps with existing duty (2025-08-12 to 2025-08-16)
        end_date: '2025-08-18'
      };
      
      try {
        await localClient.entities.Duty.create(conflictingDuty);
        expect.fail('Should have thrown conflict error');
      } catch (error) {
        expect(error.message).toContain('Duty conflicts with existing on_call duties');
        expect(error.message).toContain('Reporting');
        expect(error.message).toContain('2025-08-12 to 2025-08-16');
      }
    });
    
    it('should allow non-overlapping duties of same type', async () => {
      const nonConflictingDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-20', // After existing duty ends
        end_date: '2025-08-25'
      };
      
      const result = await localClient.entities.Duty.create(nonConflictingDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.team_member_id).toBe('tm1');
      expect(result.type).toBe('on_call');
    });
    
    it('should allow overlapping duties of different types', async () => {
      const differentTypeDuty = {
        team_member_id: 'tm1',
        type: 'other', // Different type from existing on_call duty
        title: 'Reporting',
        start_date: '2025-08-14', // Overlaps with existing on_call duty
        end_date: '2025-08-18'
      };
      
      const result = await localClient.entities.Duty.create(differentTypeDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('other');
    });
    
    it('should allow same dates for different team members', async () => {
      const differentMemberDuty = {
        team_member_id: 'tm2', // Different team member
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-12', // Same dates as existing duty for tm1
        end_date: '2025-08-16'
      };
      
      const result = await localClient.entities.Duty.create(differentMemberDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.team_member_id).toBe('tm2');
    });
  });
  
  describe('Duplicate Detection', () => {
    it('should detect exact duplicates', async () => {
      const duplicateDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-12', // Exact same as existing duty
        end_date: '2025-08-16'
      };
      
      const warnings = await localClient.entities.Duty.checkForDuplicates(duplicateDuty);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('exact_duplicate');
      expect(warnings[0].severity).toBe('high');
    });
    
    it('should not flag non-duplicates', async () => {
      const uniqueDuty = {
        team_member_id: 'tm2',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-09-01',
        end_date: '2025-09-05'
      };
      
      const warnings = await localClient.entities.Duty.checkForDuplicates(uniqueDuty);
      
      expect(warnings).toHaveLength(0);
    });
  });
});

describe('Calendar Integration Tests', () => {
  it('should create calendar event when duty is created', async () => {
    const dutyData = {
      team_member_id: 'tm2',
      type: 'on_call',
      title: 'Metering',
      start_date: '2025-09-01',
      end_date: '2025-09-05',
      description: 'Test duty with calendar event'
    };
    
    const duty = await localClient.entities.Duty.create(dutyData);
    
    // Check that calendar event was created
    const calendarEvents = JSON.parse(mockLocalStorage.getItem('calendar_events') || '[]');
    const dutyEvent = calendarEvents.find(event => event.duty_id === duty.id);
    
    expect(dutyEvent).toBeDefined();
    expect(dutyEvent.title).toBe('Metering');
    expect(dutyEvent.event_type).toBe('duty');
    expect(dutyEvent.start_date).toBe('2025-09-01');
    expect(dutyEvent.end_date).toBe('2025-09-05');
    expect(dutyEvent.all_day).toBe(true);
  });
  
  it('should handle calendar event creation failure gracefully', async () => {
    // Mock calendar event creation to fail
    const originalCreateDutyEvent = localClient.entities.CalendarEvent.createDutyEvent;
    localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockRejectedValue(new Error('Calendar service unavailable'));
    
    const dutyData = {
      team_member_id: 'tm2',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-09-10',
      end_date: '2025-09-15'
    };
    
    try {
      await localClient.entities.Duty.create(dutyData);
      expect.fail('Should have thrown error due to calendar event failure');
    } catch (error) {
      expect(error.message).toContain('Calendar event creation failed');
    }
    
    // Restore original method
    localClient.entities.CalendarEvent.createDutyEvent = originalCreateDutyEvent;
  });
});

describe('Error Handling Tests', () => {
  it('should parse API errors correctly', () => {
    const networkError = new Error('fetch failed');
    const parsedError = parseApiError(networkError);
    expect(parsedError).toBe('Unable to connect to the server. Please check your internet connection and try again.');
    
    const validationError = new Error('Validation failed: title is required');
    const parsedValidationError = parseApiError(validationError);
    expect(parsedValidationError).toBe('The data you entered is invalid. Please check your inputs and try again.');
    
    const conflictError = new Error('Duty conflicts with existing duties');
    const parsedConflictError = parseApiError(conflictError);
    expect(parsedConflictError).toBe('This duty conflicts with existing assignments. Please adjust the dates or team member.');
  });
  
  it('should handle invalid team member ID', async () => {
    const invalidDuty = {
      team_member_id: 'invalid_id',
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-09-01',
      end_date: '2025-09-05'
    };
    
    try {
      await localClient.entities.Duty.create(invalidDuty);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error.message).toContain('Invalid team member');
    }
  });
  
  it('should handle invalid duty type/title combinations', async () => {
    const invalidCombination = {
      team_member_id: 'tm1',
      type: 'devops',
      title: 'Reporting', // Invalid: devops duties can only have "DevOps" title
      start_date: '2025-09-01',
      end_date: '2025-09-05'
    };
    
    try {
      await localClient.entities.Duty.create(invalidCombination);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error.message).toContain('Invalid combination');
      expect(error.message).toContain('devops duties cannot have title "Reporting"');
    }
  });
});

describe('Data Integrity Tests', () => {
  it('should maintain data consistency after duty creation', async () => {
    const dutyData = {
      team_member_id: 'tm2',
      type: 'other',
      title: 'Metering',
      start_date: '2025-09-20',
      end_date: '2025-09-25'
    };
    
    const duty = await localClient.entities.Duty.create(dutyData);
    
    // Check duty was saved correctly
    const savedDuties = JSON.parse(mockLocalStorage.getItem('duties'));
    const savedDuty = savedDuties.find(d => d.id === duty.id);
    
    expect(savedDuty).toBeDefined();
    expect(savedDuty.team_member_id).toBe('tm2');
    expect(savedDuty.type).toBe('other');
    expect(savedDuty.title).toBe('Metering');
    expect(savedDuty.created_date).toBeDefined();
    expect(savedDuty.updated_date).toBeDefined();
  });
  
  it('should rollback duty creation if calendar event fails', async () => {
    // Mock calendar event creation to fail
    const originalCreateDutyEvent = localClient.entities.CalendarEvent.createDutyEvent;
    localClient.entities.CalendarEvent.createDutyEvent = vi.fn().mockRejectedValue(new Error('Calendar service unavailable'));
    
    const initialDutyCount = JSON.parse(mockLocalStorage.getItem('duties')).length;
    
    const dutyData = {
      team_member_id: 'tm2',
      type: 'other',
      title: 'Reporting',
      start_date: '2025-09-30',
      end_date: '2025-10-05'
    };
    
    try {
      await localClient.entities.Duty.create(dutyData);
      expect.fail('Should have thrown error');
    } catch (error) {
      // Check that duty was rolled back
      const finalDutyCount = JSON.parse(mockLocalStorage.getItem('duties')).length;
      expect(finalDutyCount).toBe(initialDutyCount);
    }
    
    // Restore original method
    localClient.entities.CalendarEvent.createDutyEvent = originalCreateDutyEvent;
  });
});

describe('Performance Tests', () => {
  it('should handle conflict detection efficiently', async () => {
    // Test conflict detection performance with existing duties
    const startTime = Date.now();
    
    const newDuty = {
      team_member_id: 'tm1',
      type: 'devops',
      title: 'DevOps',
      start_date: '2025-12-01',
      end_date: '2025-12-05'
    };
    
    const result = await localClient.entities.Duty.create(newDuty);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(result).toBeDefined();
    expect(result.type).toBe('devops');
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
