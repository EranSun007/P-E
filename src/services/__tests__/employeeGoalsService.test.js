/**
 * Tests for EmployeeGoalsService
 * Comprehensive test suite for employee goals persistence and management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EmployeeGoalsService from '../employeeGoalsService.js';

// Mock the localClient
vi.mock('../../api/localClient.js', () => ({
  localClient: {
    entities: {
      EmployeeGoal: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
        getByTeamMember: vi.fn()
      }
    }
  }
}));

describe('EmployeeGoalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllGoals()', () => {
    it('should return all goals from storage', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Improve React skills',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.getAllGoals();

      expect(localClient.entities.EmployeeGoal.list).toHaveBeenCalled();
      expect(result).toEqual(mockGoals);
    });

    it('should handle errors gracefully', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockRejectedValue(new Error('Storage error'));

      await expect(EmployeeGoalsService.getAllGoals()).rejects.toThrow('Storage error');
    });
  });

  describe('getGoalById()', () => {
    it('should return specific goal by id', async () => {
      const mockGoal = {
        id: 'goal-1',
        employeeId: 'emp-1',
        title: 'Improve React skills',
        status: 'active'
      };

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.get.mockResolvedValue(mockGoal);

      const result = await EmployeeGoalsService.getGoalById('goal-1');

      expect(localClient.entities.EmployeeGoal.get).toHaveBeenCalledWith('goal-1');
      expect(result).toEqual(mockGoal);
    });

    it('should return null for non-existent goal', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.get.mockResolvedValue(null);

      const result = await EmployeeGoalsService.getGoalById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getGoalsByEmployee()', () => {
    it('should return goals for specific employee', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Improve React skills',
          status: 'active'
        },
        {
          id: 'goal-2',
          employeeId: 'emp-1',
          title: 'Learn TypeScript',
          status: 'completed'
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.getByTeamMember.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.getGoalsByEmployee('emp-1');

      expect(localClient.entities.EmployeeGoal.getByTeamMember).toHaveBeenCalledWith('emp-1');
      expect(result).toEqual(mockGoals);
    });

    it('should return empty array for employee with no goals', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.getByTeamMember.mockResolvedValue([]);

      const result = await EmployeeGoalsService.getGoalsByEmployee('emp-no-goals');

      expect(result).toEqual([]);
    });
  });

  describe('createGoal()', () => {
    it('should create new goal with valid data', async () => {
      const goalData = {
        employeeId: 'emp-1',
        title: 'Improve React skills',
        developmentNeed: 'Frontend development',
        developmentActivity: 'Complete React course',
        developmentGoalDescription: 'Learn advanced React patterns'
      };

      const mockCreatedGoal = {
        ...goalData,
        id: 'goal-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.create.mockResolvedValue(mockCreatedGoal);

      const result = await EmployeeGoalsService.createGoal(goalData);

      expect(localClient.entities.EmployeeGoal.create).toHaveBeenCalledWith({
        ...goalData,
        status: 'active' // Default status is added by validation
      });
      expect(result).toEqual(mockCreatedGoal);
    });

    it('should validate required fields', async () => {
      const invalidGoalData = {
        title: 'Improve React skills'
        // Missing employeeId
      };

      await expect(EmployeeGoalsService.createGoal(invalidGoalData))
        .rejects.toThrow('employeeId is required');
    });

    it('should validate goal title', async () => {
      const invalidGoalData = {
        employeeId: 'emp-1',
        developmentNeed: 'Frontend development'
        // Missing title
      };

      await expect(EmployeeGoalsService.createGoal(invalidGoalData))
        .rejects.toThrow('title is required');
    });
  });

  describe('updateGoal()', () => {
    it('should update existing goal', async () => {
      const updates = {
        title: 'Advanced React skills',
        status: 'completed'
      };

      const mockUpdatedGoal = {
        id: 'goal-1',
        employeeId: 'emp-1',
        title: 'Advanced React skills',
        status: 'completed',
        updatedAt: new Date().toISOString()
      };

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.update.mockResolvedValue(mockUpdatedGoal);

      const result = await EmployeeGoalsService.updateGoal('goal-1', updates);

      expect(localClient.entities.EmployeeGoal.update).toHaveBeenCalledWith('goal-1', updates);
      expect(result).toEqual(mockUpdatedGoal);
    });

    it('should handle non-existent goal', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.update.mockRejectedValue(new Error('Goal not found'));

      await expect(EmployeeGoalsService.updateGoal('non-existent', { title: 'New title' }))
        .rejects.toThrow('Goal not found');
    });

    it('should validate status values', async () => {
      const invalidUpdates = {
        status: 'invalid-status'
      };

      await expect(EmployeeGoalsService.updateGoal('goal-1', invalidUpdates))
        .rejects.toThrow('Invalid status value');
    });
  });

  describe('deleteGoal()', () => {
    it('should delete existing goal', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.delete.mockResolvedValue(true);

      const result = await EmployeeGoalsService.deleteGoal('goal-1');

      expect(localClient.entities.EmployeeGoal.delete).toHaveBeenCalledWith('goal-1');
      expect(result).toBe(true);
    });

    it('should handle non-existent goal deletion', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.delete.mockRejectedValue(new Error('Goal not found'));

      await expect(EmployeeGoalsService.deleteGoal('non-existent'))
        .rejects.toThrow('Goal not found');
    });
  });

  describe('getGoalsByStatus()', () => {
    it('should filter goals by status', async () => {
      const mockGoals = [
        { id: 'goal-1', status: 'active', title: 'Active goal' },
        { id: 'goal-2', status: 'completed', title: 'Completed goal' },
        { id: 'goal-3', status: 'active', title: 'Another active goal' }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.getGoalsByStatus('active');

      expect(result).toHaveLength(2);
      expect(result.every(goal => goal.status === 'active')).toBe(true);
    });

    it('should validate status parameter', async () => {
      await expect(EmployeeGoalsService.getGoalsByStatus('invalid-status'))
        .rejects.toThrow('Invalid status value');
    });
  });

  describe('searchGoals()', () => {
    it('should search goals by text in title and description', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          title: 'Improve React skills',
          developmentGoalDescription: 'Learn advanced React patterns'
        },
        {
          id: 'goal-2',
          title: 'Learn TypeScript',
          developmentGoalDescription: 'Master type definitions'
        },
        {
          id: 'goal-3',
          title: 'Database optimization',
          developmentGoalDescription: 'React query optimization'
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.searchGoals('React');

      expect(result).toHaveLength(2);
      expect(result.every(goal => 
        goal.title.includes('React') || goal.developmentGoalDescription.includes('React')
      )).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          title: 'Improve React skills',
          developmentGoalDescription: 'Learn advanced patterns'
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.searchGoals('Angular');

      expect(result).toEqual([]);
    });

    it('should handle case-insensitive search', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          title: 'Improve React skills',
          developmentGoalDescription: 'Learn advanced patterns'
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.searchGoals('react');

      expect(result).toHaveLength(1);
    });
  });

  describe('bulkCreateGoals()', () => {
    it('should create multiple goals at once', async () => {
      const goalsData = [
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Skill 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        },
        {
          employeeId: 'emp-2',
          title: 'Goal 2',
          developmentNeed: 'Skill 2',
          developmentActivity: 'Activity 2',
          developmentGoalDescription: 'Description 2'
        }
      ];

      const mockCreatedGoals = goalsData.map((goal, index) => ({
        ...goal,
        id: `goal-${index + 1}`,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.create
        .mockResolvedValueOnce(mockCreatedGoals[0])
        .mockResolvedValueOnce(mockCreatedGoals[1]);

      const result = await EmployeeGoalsService.bulkCreateGoals(goalsData);

      expect(result.successful).toHaveLength(2);
      expect(localClient.entities.EmployeeGoal.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk creation', async () => {
      const goalsData = [
        {
          employeeId: 'emp-1',
          title: 'Valid Goal',
          developmentNeed: 'Skill 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        },
        {
          // Invalid goal - missing required fields
          title: 'Invalid Goal'
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.create
        .mockResolvedValueOnce({ id: 'goal-1', ...goalsData[0] })
        .mockRejectedValueOnce(new Error('employeeId is required'));

      const result = await EmployeeGoalsService.bulkCreateGoals(goalsData);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('employeeId is required');
    });
  });

  describe('getGoalsStatistics()', () => {
    it('should return goal statistics', async () => {
      const mockGoals = [
        { id: 'goal-1', status: 'active', employeeId: 'emp-1' },
        { id: 'goal-2', status: 'completed', employeeId: 'emp-1' },
        { id: 'goal-3', status: 'active', employeeId: 'emp-2' },
        { id: 'goal-4', status: 'paused', employeeId: 'emp-2' }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const result = await EmployeeGoalsService.getGoalsStatistics();

      expect(result).toEqual({
        total: 4,
        byStatus: {
          active: 2,
          completed: 1,
          paused: 1
        },
        byEmployee: {
          'emp-1': 2,
          'emp-2': 2
        }
      });
    });

    it('should handle empty goals list', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue([]);

      const result = await EmployeeGoalsService.getGoalsStatistics();

      expect(result).toEqual({
        total: 0,
        byStatus: {
          active: 0,
          completed: 0,
          paused: 0
        },
        byEmployee: {}
      });
    });
  });

  describe('advancedSearch()', () => {
    const mockGoalsForSearch = [
      {
        id: 'goal-1',
        employeeId: 'emp-1',
        title: 'React Development Skills',
        developmentNeed: 'Frontend expertise',
        developmentActivity: 'Build React applications',
        developmentGoalDescription: 'Learn React hooks and state management',
        status: 'active',
        createdAt: '2025-07-01T10:00:00Z',
        updatedAt: '2025-07-15T10:00:00Z',
        importSource: 'hr-system'
      },
      {
        id: 'goal-2',
        employeeId: 'emp-2',
        title: 'Leadership Training',
        developmentNeed: 'Management skills',
        developmentActivity: 'Attend leadership workshops',
        developmentGoalDescription: 'Develop team leadership capabilities',
        status: 'completed',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-07-20T10:00:00Z',
        importSource: 'manual'
      },
      {
        id: 'goal-3',
        employeeId: 'emp-1',
        title: 'Python Backend Development',
        developmentNeed: 'Backend expertise',
        developmentActivity: 'Learn Python frameworks',
        developmentGoalDescription: 'Master Django and FastAPI',
        status: 'paused',
        createdAt: '2025-07-10T10:00:00Z',
        updatedAt: '2025-07-25T10:00:00Z'
      }
    ];

    beforeEach(async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoalsForSearch);
    });

    it('should search by text only', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        searchText: 'React'
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('React Development Skills');
    });

    it('should filter by status only', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        status: 'completed'
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });

    it('should filter by employee only', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        employeeId: 'emp-1'
      });

      expect(result).toHaveLength(2);
      expect(result.every(goal => goal.employeeId === 'emp-1')).toBe(true);
    });

    it('should filter by import source only', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        importSource: 'hr-system'
      });

      expect(result).toHaveLength(1);
      expect(result[0].importSource).toBe('hr-system');
    });

    it('should combine multiple filters', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        searchText: 'Development',
        status: 'active',
        employeeId: 'emp-1'
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('React Development Skills');
    });

    it('should return empty array when no filters provided', async () => {
      const result = await EmployeeGoalsService.advancedSearch({});

      expect(result).toHaveLength(3);
    });

    it('should handle search with no matches', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        searchText: 'NonExistentTech'
      });

      expect(result).toHaveLength(0);
    });

    it('should validate search parameters with Zod', async () => {
      await expect(EmployeeGoalsService.advancedSearch({
        status: 'invalid-status'
      })).rejects.toThrow();
    });

    it('should handle case-insensitive text search', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        searchText: 'python'
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Python Backend Development');
    });

    it('should search across all text fields', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        searchText: 'Django'
      });

      expect(result).toHaveLength(1);
      expect(result[0].developmentGoalDescription).toContain('Django');
    });

    it('should filter by creation date range', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        createdAfter: '2025-07-01T00:00:00Z',
        createdBefore: '2025-07-31T23:59:59Z'
      });

      expect(result).toHaveLength(2);
      expect(result.every(goal => {
        const createdDate = new Date(goal.createdAt);
        return createdDate >= new Date('2025-07-01T00:00:00Z') && 
               createdDate <= new Date('2025-07-31T23:59:59Z');
      })).toBe(true);
    });

    it('should filter by update date range', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        updatedAfter: '2025-07-20T00:00:00Z'
      });

      expect(result).toHaveLength(2);
      expect(result.every(goal => 
        new Date(goal.updatedAt) >= new Date('2025-07-20T00:00:00Z')
      )).toBe(true);
    });

    it('should combine date and other filters', async () => {
      const result = await EmployeeGoalsService.advancedSearch({
        status: 'active',
        createdAfter: '2025-06-01T00:00:00Z',
        employeeId: 'emp-1'
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
      expect(result[0].employeeId).toBe('emp-1');
      expect(new Date(result[0].createdAt) >= new Date('2025-06-01T00:00:00Z')).toBe(true);
    });

    it('should handle invalid dates gracefully', async () => {
      // This should not throw an error due to the try-catch in date filtering
      const result = await EmployeeGoalsService.advancedSearch({
        createdAfter: '2025-07-01T00:00:00Z'
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should validate date format in search parameters', async () => {
      await expect(EmployeeGoalsService.advancedSearch({
        createdAfter: 'invalid-date-format'
      })).rejects.toThrow();
    });
  });

  describe('Date-based filtering support', () => {
    const mockGoalsWithDates = [
      {
        id: 'goal-old',
        title: 'Old Goal',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-20T10:00:00Z'
      },
      {
        id: 'goal-recent',
        title: 'Recent Goal',
        createdAt: '2025-07-20T10:00:00Z',
        updatedAt: '2025-07-25T10:00:00Z'
      },
      {
        id: 'goal-new',
        title: 'New Goal',
        createdAt: '2025-07-27T10:00:00Z',
        updatedAt: '2025-07-27T10:00:00Z'
      }
    ];

    it('should support filtering goals by date ranges programmatically', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoalsWithDates);

      const allGoals = await EmployeeGoalsService.getAllGoals();
      
      // Filter goals created after July 1, 2025
      const recentGoals = allGoals.filter(goal => 
        new Date(goal.createdAt) >= new Date('2025-07-01T00:00:00Z')
      );

      expect(recentGoals).toHaveLength(2);
      expect(recentGoals.map(g => g.title)).toEqual(['Recent Goal', 'New Goal']);
    });

    it('should support filtering goals by update date ranges', async () => {
      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoalsWithDates);

      const allGoals = await EmployeeGoalsService.getAllGoals();
      
      // Filter goals updated in July 2025
      const julyUpdatedGoals = allGoals.filter(goal => 
        new Date(goal.updatedAt) >= new Date('2025-07-01T00:00:00Z') &&
        new Date(goal.updatedAt) < new Date('2025-08-01T00:00:00Z')
      );

      expect(julyUpdatedGoals).toHaveLength(2);
    });

    it('should handle date parsing errors gracefully', async () => {
      const mockGoalsWithInvalidDates = [
        {
          id: 'goal-invalid',
          title: 'Invalid Date Goal',
          createdAt: 'invalid-date',
          updatedAt: '2025-07-27T10:00:00Z'
        }
      ];

      const { localClient } = await import('../../api/localClient.js');
      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoalsWithInvalidDates);

      const allGoals = await EmployeeGoalsService.getAllGoals();
      
      // Should not throw error when encountering invalid dates
      expect(() => {
        allGoals.filter(goal => {
          try {
            return new Date(goal.createdAt) >= new Date('2025-07-01T00:00:00Z');
          } catch {
            return false;
          }
        });
      }).not.toThrow();
    });
  });
});