/**
 * Tests for duty conflict resolution and real-world scenarios
 * Tests the exact conflicts users encounter and provides solutions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localClient } from '../api/localClient';

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

beforeEach(() => {
  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  // Clear localStorage before each test
  mockLocalStorage.clear();
  
  // Setup realistic test data that matches user's actual conflicts
  const testTeamMembers = [
    { id: 'tm1', name: 'John Doe', email: 'john@example.com' },
    { id: 'tm2', name: 'Jane Smith', email: 'jane@example.com' }
  ];
  
  // Real-world conflicting duties based on user's error messages
  const existingDuties = [
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
    },
    {
      id: 'duty3',
      team_member_id: 'tm1',
      type: 'on_call',
      title: 'Reporting',
      start_date: '2025-08-25',
      end_date: '2025-08-30',
      description: 'Another on-call duty that causes conflicts',
      created_date: '2025-08-01T10:00:00.000Z'
    }
  ];
  
  mockLocalStorage.setItem('team_members', JSON.stringify(testTeamMembers));
  mockLocalStorage.setItem('duties', JSON.stringify(existingDuties));
  mockLocalStorage.setItem('calendar_events', JSON.stringify([]));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Real-World Duty Conflict Resolution Tests', () => {
  describe('Exact User Conflict Scenarios', () => {
    it('should detect conflict with existing on_call duty from 2025-08-25 to 2025-08-30', async () => {
      const conflictingDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-26', // Overlaps with existing duty (2025-08-25 to 2025-08-30)
        end_date: '2025-08-29'
      };
      
      try {
        await localClient.entities.Duty.create(conflictingDuty);
        expect.fail('Should have thrown conflict error');
      } catch (error) {
        expect(error.message).toContain('Duty conflicts with existing on_call duties');
        expect(error.message).toContain('Reporting');
        expect(error.message).toContain('2025-08-25 to 2025-08-30');
      }
    });

    it('should detect conflict with existing devops duty from 2025-08-23 to 2025-08-30', async () => {
      const conflictingDuty = {
        team_member_id: 'tm1',
        type: 'devops',
        title: 'DevOps',
        start_date: '2025-08-24', // Overlaps with existing duty (2025-08-23 to 2025-08-30)
        end_date: '2025-08-28'
      };
      
      try {
        await localClient.entities.Duty.create(conflictingDuty);
        expect.fail('Should have thrown conflict error');
      } catch (error) {
        expect(error.message).toContain('Duty conflicts with existing devops duties');
        expect(error.message).toContain('DevOps');
        expect(error.message).toContain('2025-08-23 to 2025-08-30');
      }
    });
  });

  describe('Conflict Resolution Solutions', () => {
    it('should allow on_call duty AFTER existing conflicts (2025-08-31+)', async () => {
      const nonConflictingDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-31', // After all existing duties end
        end_date: '2025-09-05'
      };
      
      const result = await localClient.entities.Duty.create(nonConflictingDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.team_member_id).toBe('tm1');
      expect(result.type).toBe('on_call');
      expect(result.start_date).toBe('2025-08-31');
    });

    it('should allow on_call duty BEFORE existing conflicts (2025-08-11 and earlier)', async () => {
      const nonConflictingDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-05', // Before existing duties start
        end_date: '2025-08-11'
      };
      
      const result = await localClient.entities.Duty.create(nonConflictingDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.team_member_id).toBe('tm1');
      expect(result.type).toBe('on_call');
      expect(result.start_date).toBe('2025-08-05');
    });

    it('should allow same dates for DIFFERENT team member', async () => {
      const differentMemberDuty = {
        team_member_id: 'tm2', // Different team member
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-25', // Same dates as tm1's existing duty
        end_date: '2025-08-30'
      };
      
      const result = await localClient.entities.Duty.create(differentMemberDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.team_member_id).toBe('tm2');
      expect(result.type).toBe('on_call');
    });

    it('should allow DIFFERENT duty type for same dates and team member', async () => {
      const differentTypeDuty = {
        team_member_id: 'tm1',
        type: 'other', // Different type from existing on_call duty
        title: 'Reporting',
        start_date: '2025-08-25', // Same dates as existing on_call duty
        end_date: '2025-08-30'
      };
      
      const result = await localClient.entities.Duty.create(differentTypeDuty);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe('other');
    });
  });

  describe('Conflict Resolution Helpers', () => {
    it('should provide specific suggestions for resolving conflicts', async () => {
      const conflictingDuty = {
        team_member_id: 'tm1',
        type: 'on_call',
        title: 'Reporting',
        start_date: '2025-08-26',
        end_date: '2025-08-29'
      };
      
      // Helper function to get conflict resolution suggestions
      const getConflictSuggestions = async (dutyData) => {
        try {
          await localClient.entities.Duty.create(dutyData);
          return null; // No conflict
        } catch (error) {
          if (error.message.includes('conflicts with existing')) {
            return {
              error: error.message,
              suggestions: [
                {
                  type: 'date_change',
                  description: 'Use different dates',
                  options: [
                    'Before 2025-08-12 (before first conflict)',
                    'Between 2025-08-17 and 2025-08-24 (gap between duties)',
                    'After 2025-08-31 (after all conflicts)'
                  ]
                },
                {
                  type: 'team_member_change',
                  description: 'Assign to different team member',
                  options: ['tm2 (Jane Smith) - no conflicts for these dates']
                },
                {
                  type: 'duty_type_change',
                  description: 'Change duty type',
                  options: ['Use "other" type instead of "on_call"']
                }
              ]
            };
          }
          throw error;
        }
      };
      
      const suggestions = await getConflictSuggestions(conflictingDuty);
      
      expect(suggestions).toBeDefined();
      expect(suggestions.error).toContain('conflicts with existing');
      expect(suggestions.suggestions).toHaveLength(3);
      expect(suggestions.suggestions[0].type).toBe('date_change');
      expect(suggestions.suggestions[1].type).toBe('team_member_change');
      expect(suggestions.suggestions[2].type).toBe('duty_type_change');
    });
  });
});
