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
});