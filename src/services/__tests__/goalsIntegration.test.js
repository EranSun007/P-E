/**
 * Tests for cross-feature integration of employee goals
 * Task 6.1: Write tests for goals integration with other features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import EmployeeGoalsService from '../employeeGoalsService.js';
import { AgendaService } from '../../utils/agendaService.js';
import { localClient } from '../../api/localClient.js';

// Mock the localClient
vi.mock('../../api/localClient.js', () => ({
  localClient: {
    entities: {
      EmployeeGoal: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getByTeamMember: vi.fn()
      },
      OneOnOne: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      TeamMember: {
        list: vi.fn(),
        get: vi.fn()
      },
      Task: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      }
    }
  }
}));

describe('Goals Cross-Feature Integration', () => {
  const mockTeamMember = {
    id: 'member-1',
    name: 'John Doe',
    email: 'john@example.com'
  };

  const mockGoals = [
    {
      id: 'goal-1',
      employeeId: 'member-1',
      title: 'Learn React Advanced Patterns',
      developmentNeed: 'Frontend Architecture',
      developmentActivity: 'Complete advanced React course',
      developmentGoalDescription: 'Master advanced React patterns for better code architecture',
      status: 'active',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'goal-2',
      employeeId: 'member-1',
      title: 'Improve Leadership Skills',
      developmentNeed: 'Team Leadership',
      developmentActivity: 'Lead a small project team',
      developmentGoalDescription: 'Develop skills in team coordination and mentoring',
      status: 'active',
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z'
    }
  ];

  const mockOneOnOnes = [
    {
      id: 'meeting-1',
      team_member_id: 'member-1',
      date: '2025-01-15T10:00:00Z',
      notes: [
        {
          text: 'Discussed progress on React learning',
          timestamp: '2025-01-15T10:05:00Z',
          referenced_entity: { type: 'team_member', id: 'member-1' },
          isDiscussed: false
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);
    localClient.entities.EmployeeGoal.getByTeamMember.mockResolvedValue(mockGoals);
    localClient.entities.TeamMember.list.mockResolvedValue([mockTeamMember]);
    localClient.entities.OneOnOne.list.mockResolvedValue(mockOneOnOnes);
  });

  describe('One-on-One Meeting Integration', () => {
    it('should provide goals context for team member meetings', async () => {
      const goalsContext = await EmployeeGoalsService.getGoalsByEmployee('member-1');
      
      expect(goalsContext).toHaveLength(2);
      expect(goalsContext[0].title).toBe('Learn React Advanced Patterns');
      expect(goalsContext[1].title).toBe('Improve Leadership Skills');
    });

    it('should identify active goals for meeting preparation', async () => {
      const activeGoals = await EmployeeGoalsService.getGoalsByStatus('active');
      
      expect(activeGoals).toHaveLength(2);
      expect(activeGoals.every(goal => goal.status === 'active')).toBe(true);
    });

    it('should filter goals by development need for targeted discussions', async () => {
      const searchResults = await EmployeeGoalsService.searchGoals('Frontend');
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].developmentNeed).toBe('Frontend Architecture');
    });

    it('should provide goals statistics for meeting context', async () => {
      const stats = await EmployeeGoalsService.getGoalsStatistics();
      
      expect(stats.total).toBe(2);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byEmployee['member-1']).toBe(2);
    });
  });

  describe('Task Creation Integration', () => {
    it('should enable linking tasks to specific goals', async () => {
      const goals = await EmployeeGoalsService.getGoalsByEmployee('member-1');
      
      // Simulate task creation with goal reference
      const taskData = {
        title: 'Setup React project structure',
        assignee: 'member-1',
        relatedGoalId: goals[0].id,
        category: 'development'
      };

      expect(goals[0].id).toBe('goal-1');
      expect(taskData.relatedGoalId).toBe('goal-1');
    });

    it('should support filtering goals for task creation dropdown', async () => {
      const developmentGoals = await EmployeeGoalsService.searchGoals('React');
      
      expect(developmentGoals).toHaveLength(1);
      expect(developmentGoals[0].title).toContain('React');
    });

    it('should validate goal-task relationships', async () => {
      const goal = await EmployeeGoalsService.getGoalById('goal-1');
      
      expect(goal).toBeTruthy();
      expect(goal.employeeId).toBe('member-1');
      // Task should belong to same employee as goal
    });
  });

  describe('Analytics Integration', () => {
    it('should provide goals completion metrics', async () => {
      const stats = await EmployeeGoalsService.getGoalsStatistics();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('byEmployee');
      expect(typeof stats.byStatus.completed).toBe('number');
    });

    it('should support goals progress tracking over time', async () => {
      const searchParams = {
        createdAfter: '2025-01-01T00:00:00Z',
        createdBefore: '2025-01-31T23:59:59Z'
      };
      
      const monthlyGoals = await EmployeeGoalsService.advancedSearch(searchParams);
      
      expect(monthlyGoals).toHaveLength(2);
      expect(monthlyGoals.every(goal => 
        new Date(goal.createdAt) >= new Date(searchParams.createdAfter)
      )).toBe(true);
    });

    it('should calculate goals completion rates by employee', async () => {
      // Add completed goal to test data
      const completedGoal = {
        ...mockGoals[0],
        id: 'goal-3',
        status: 'completed'
      };
      
      localClient.entities.EmployeeGoal.list.mockResolvedValueOnce([
        ...mockGoals,
        completedGoal
      ]);
      
      const stats = await EmployeeGoalsService.getGoalsStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byStatus.active).toBe(2);
    });
  });

  describe('Team Member Search Integration', () => {
    it('should include goals count in team member context', async () => {
      const memberGoals = await EmployeeGoalsService.getGoalsByEmployee('member-1');
      
      expect(memberGoals).toHaveLength(2);
      // This would be used to display goals count in search results
    });

    it('should support searching team members by goal content', async () => {
      const goalsWithReact = await EmployeeGoalsService.searchGoals('React');
      const affectedEmployees = [...new Set(goalsWithReact.map(g => g.employeeId))];
      
      expect(affectedEmployees).toContain('member-1');
      expect(affectedEmployees).toHaveLength(1);
    });

    it('should provide goals summary for team member profiles', async () => {
      const summary = await EmployeeGoalsService.advancedSearch({ 
        employeeId: 'member-1' 
      });
      
      expect(summary).toHaveLength(2);
      expect(summary.every(goal => goal.employeeId === 'member-1')).toBe(true);
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle missing goals gracefully in one-on-one context', async () => {
      localClient.entities.EmployeeGoal.getByTeamMember.mockResolvedValueOnce([]);
      
      const goals = await EmployeeGoalsService.getGoalsByEmployee('nonexistent-member');
      
      expect(goals).toEqual([]);
    });

    it('should handle invalid goal references in task creation', async () => {
      localClient.entities.EmployeeGoal.get.mockResolvedValueOnce(null);
      
      const goal = await EmployeeGoalsService.getGoalById('invalid-goal-id');
      
      expect(goal).toBeNull();
    });

    it('should handle empty statistics gracefully', async () => {
      localClient.entities.EmployeeGoal.list.mockResolvedValueOnce([]);
      
      const stats = await EmployeeGoalsService.getGoalsStatistics();
      
      expect(stats.total).toBe(0);
      expect(stats.byStatus.active).toBe(0);
      expect(Object.keys(stats.byEmployee)).toHaveLength(0);
    });
  });

  describe('Data Consistency Across Features', () => {
    it('should maintain consistent employee references', async () => {
      const goals = await EmployeeGoalsService.getGoalsByEmployee('member-1');
      
      goals.forEach(goal => {
        expect(goal.employeeId).toBe('member-1');
      });
    });

    it('should handle concurrent updates across features', async () => {
      // Test that goal updates don't break other feature references
      const updatedGoal = await EmployeeGoalsService.updateGoal('goal-1', {
        status: 'completed'
      });
      
      expect(localClient.entities.EmployeeGoal.update).toHaveBeenCalledWith(
        'goal-1',
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should validate cross-feature data integrity', async () => {
      const goals = await EmployeeGoalsService.getAllGoals();
      
      // All goals should have valid employee references
      goals.forEach(goal => {
        expect(goal.employeeId).toBeTruthy();
        expect(typeof goal.employeeId).toBe('string');
      });
    });
  });
});

describe('Goals Context Service Integration', () => {
  describe('Meeting Preparation Context', () => {
    it('should provide relevant goals for upcoming meetings', async () => {
      const memberGoals = await EmployeeGoalsService.getGoalsByEmployee('member-1');
      const activeGoals = memberGoals.filter(goal => goal.status === 'active');
      
      expect(activeGoals).toHaveLength(2);
      expect(activeGoals[0].title).toBe('Learn React Advanced Patterns');
    });

    it('should prioritize recently updated goals', async () => {
      const recentGoals = await EmployeeGoalsService.advancedSearch({
        updatedAfter: '2025-01-01T00:00:00Z'
      });
      
      expect(recentGoals).toHaveLength(2);
    });
  });

  describe('Task Creation Context', () => {
    it('should suggest relevant goals for development tasks', async () => {
      const developmentGoals = await EmployeeGoalsService.searchGoals('Learn');
      
      expect(developmentGoals).toHaveLength(1);
      expect(developmentGoals[0].developmentActivity).toContain('course');
    });
  });

  describe('Analytics Context', () => {
    it('should provide goals metrics for dashboard integration', async () => {
      const stats = await EmployeeGoalsService.getGoalsStatistics();
      
      expect(stats).toMatchObject({
        total: expect.any(Number),
        byStatus: expect.objectContaining({
          active: expect.any(Number),
          completed: expect.any(Number),
          paused: expect.any(Number)
        }),
        byEmployee: expect.any(Object)
      });
    });
  });
});