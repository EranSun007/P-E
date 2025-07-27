// src/services/__tests__/goalsIntegrationService.test.js
// Tests for goals integration with other features

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeeGoalsService } from '../employeeGoalsService.js';
import { localClient } from '../../api/localClient.js';

// Mock localClient
vi.mock('../../api/localClient.js', () => ({
  localClient: {
    entities: {
      EmployeeGoal: {
        list: vi.fn(),
        getByEmployee: vi.fn(),
      },
      AgendaItem: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      Task: {
        list: vi.fn(),
        create: vi.fn(),
      }
    }
  }
}));

describe('Goals Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('One-on-One Meeting Integration', () => {
    it('should retrieve goals context for meeting preparation', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Lead CAP/Otel project',
          developmentNeed: 'Project management skills',
          status: 'active'
        },
        {
          id: 'goal-2',
          employeeId: 'emp-1',
          title: 'AI Tools expertise',
          developmentNeed: 'AI tools knowledge',
          status: 'active'
        }
      ];

      localClient.entities.EmployeeGoal.getByEmployee.mockResolvedValue(mockGoals);

      const goalsContext = await EmployeeGoalsService.getGoalsForMeeting('emp-1');

      expect(goalsContext).toEqual({
        activeGoals: mockGoals,
        goalsSummary: {
          total: 2,
          active: 2,
          completed: 0,
          paused: 0
        },
        suggestedTopics: [
          'Project management skills development progress',
          'AI tools knowledge advancement'
        ]
      });
    });

    it('should handle employees with no goals gracefully', async () => {
      localClient.entities.EmployeeGoal.getByEmployee.mockResolvedValue([]);

      const goalsContext = await EmployeeGoalsService.getGoalsForMeeting('emp-2');

      expect(goalsContext).toEqual({
        activeGoals: [],
        goalsSummary: {
          total: 0,
          active: 0,
          completed: 0,
          paused: 0
        },
        suggestedTopics: []
      });
    });

    it('should suggest agenda items based on goal status', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Security Domain Leadership',
          status: 'active',
          developmentGoalDescription: '1. Schedule team meeting by 2025-08-01. 2. Review protocols by 2025-08-15.'
        }
      ];

      localClient.entities.EmployeeGoal.getByEmployee.mockResolvedValue(mockGoals);

      const suggestions = await EmployeeGoalsService.suggestAgendaItems('emp-1');

      expect(suggestions).toContain('Discuss progress on Security Domain Leadership goal');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Task Creation Integration', () => {
    it('should associate tasks with related goals', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Lead CAP/Otel project',
          developmentActivity: 'Attend project management training'
        }
      ];

      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const relatedGoals = await EmployeeGoalsService.findRelatedGoals('project management training');

      expect(relatedGoals).toHaveLength(1);
      expect(relatedGoals[0].id).toBe('goal-1');
    });

    it('should suggest goal-related tasks for employees', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'AI Tools expertise',
          developmentActivity: 'Complete online course on AI tools',
          developmentGoalDescription: '1. Research 3 AI tools. 2. Complete course. 3. Implement pilot.'
        }
      ];

      localClient.entities.EmployeeGoal.getByEmployee.mockResolvedValue(mockGoals);

      const taskSuggestions = await EmployeeGoalsService.suggestTasksFromGoals('emp-1');

      expect(taskSuggestions).toContain('Research 3 AI tools for development excellence');
      expect(taskSuggestions).toContain('Complete online course on AI tools');
      expect(taskSuggestions).toContain('Implement AI tool pilot project');
    });

    it('should handle goals with empty development activities', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Security Leadership',
          developmentActivity: '',
          developmentGoalDescription: '1. Schedule meeting. 2. Review protocols.'
        }
      ];

      localClient.entities.EmployeeGoal.getByEmployee.mockResolvedValue(mockGoals);

      const taskSuggestions = await EmployeeGoalsService.suggestTasksFromGoals('emp-1');

      expect(taskSuggestions).toContain('Schedule meeting for Security Leadership');
      expect(taskSuggestions).toContain('Review protocols for Security Leadership');
    });
  });

  describe('Analytics Integration', () => {
    it('should provide goals analytics for metrics dashboard', async () => {
      const mockGoals = [
        { id: '1', status: 'active', createdAt: '2025-01-01' },
        { id: '2', status: 'completed', createdAt: '2025-01-15' },
        { id: '3', status: 'paused', createdAt: '2025-02-01' },
        { id: '4', status: 'active', createdAt: '2025-02-15' }
      ];

      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const analytics = await EmployeeGoalsService.getGoalsAnalytics();

      expect(analytics).toEqual({
        totalGoals: 4,
        statusBreakdown: {
          active: 2,
          completed: 1,
          paused: 1
        },
        monthlyTrends: expect.any(Array),
        completionRate: 0.25 // 1 completed out of 4 total
      });
    });

    it('should calculate goals progress by employee', async () => {
      const mockGoals = [
        { id: '1', employeeId: 'emp-1', status: 'active' },
        { id: '2', employeeId: 'emp-1', status: 'completed' },
        { id: '3', employeeId: 'emp-2', status: 'active' },
        { id: '4', employeeId: 'emp-2', status: 'completed' },
        { id: '5', employeeId: 'emp-2', status: 'completed' }
      ];

      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const employeeProgress = await EmployeeGoalsService.getEmployeeGoalsProgress();

      expect(employeeProgress['emp-1']).toEqual({
        total: 2,
        completed: 1,
        completionRate: 0.5
      });
      expect(employeeProgress['emp-2']).toEqual({
        total: 3,
        completed: 2,
        completionRate: 0.67
      });
    });
  });

  describe('Search Integration', () => {
    it('should include goals in global search results', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          employeeId: 'emp-1',
          title: 'Lead CAP/Otel project',
          developmentNeed: 'Project management',
          developmentActivity: 'Training course'
        }
      ];

      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const searchResults = await EmployeeGoalsService.searchGoalsForGlobalResults('project');

      expect(searchResults).toEqual([
        {
          type: 'goal',
          id: 'goal-1',
          title: 'Lead CAP/Otel project',
          description: 'Development Need: Project management',
          employeeId: 'emp-1',
          relevanceScore: expect.any(Number)
        }
      ]);
    });

    it('should rank search results by relevance', async () => {
      const mockGoals = [
        {
          id: 'goal-1',
          title: 'Project Leadership', // Exact match in title
          developmentNeed: 'Skills',
          employeeId: 'emp-1'
        },
        {
          id: 'goal-2',
          title: 'Team Management',
          developmentNeed: 'Project management skills', // Match in development need
          employeeId: 'emp-2'
        }
      ];

      localClient.entities.EmployeeGoal.list.mockResolvedValue(mockGoals);

      const searchResults = await EmployeeGoalsService.searchGoalsForGlobalResults('project');

      expect(searchResults[0].relevanceScore).toBeGreaterThan(searchResults[1].relevanceScore);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in meeting context', async () => {
      localClient.entities.EmployeeGoal.getByEmployee.mockRejectedValue(new Error('Database error'));

      const goalsContext = await EmployeeGoalsService.getGoalsForMeeting('emp-1');

      expect(goalsContext).toEqual({
        activeGoals: [],
        goalsSummary: {
          total: 0,
          active: 0,
          completed: 0,
          paused: 0
        },
        suggestedTopics: [],
        error: 'Failed to load goals for meeting context'
      });
    });

    it('should handle search errors gracefully', async () => {
      localClient.entities.EmployeeGoal.list.mockRejectedValue(new Error('Search failed'));

      const searchResults = await EmployeeGoalsService.searchGoalsForGlobalResults('test');

      expect(searchResults).toEqual([]);
    });
  });
});