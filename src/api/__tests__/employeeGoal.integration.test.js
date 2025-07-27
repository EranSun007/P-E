/**
 * Integration tests for EmployeeGoal entity with local storage
 * Tests the full integration between EmployeeGoalsService and localClient
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmployeeGoal } from '../entities.js';
import EmployeeGoalsService from '../../services/employeeGoalsService.js';

describe('EmployeeGoal Entity Integration', () => {
  // Clean up storage before and after each test
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Basic CRUD Operations', () => {
    it('should create, read, update, and delete goals', async () => {
      // Create a goal
      const goalData = {
        employeeId: 'team-member-1',
        title: 'Learn Advanced React',
        developmentNeed: 'Frontend Development',
        developmentActivity: 'Complete React Advanced Course',
        developmentGoalDescription: 'Master advanced React patterns including hooks, context, and performance optimization'
      };

      const createdGoal = await EmployeeGoal.create(goalData);
      
      expect(createdGoal).toMatchObject(goalData);
      expect(createdGoal.id).toBeDefined();
      expect(createdGoal.status).toBe('active');
      expect(createdGoal.createdAt).toBeDefined();
      expect(createdGoal.updatedAt).toBeDefined();

      // Read the goal
      const retrievedGoal = await EmployeeGoal.get(createdGoal.id);
      expect(retrievedGoal).toEqual(createdGoal);

      // Update the goal
      const updates = {
        status: 'completed',
        title: 'Advanced React Mastered'
      };

      const updatedGoal = await EmployeeGoal.update(createdGoal.id, updates);
      expect(updatedGoal.status).toBe('completed');
      expect(updatedGoal.title).toBe('Advanced React Mastered');
      expect(updatedGoal.updatedAt).not.toBe(createdGoal.updatedAt);

      // List goals
      const allGoals = await EmployeeGoal.list();
      expect(allGoals).toHaveLength(1);
      expect(allGoals[0]).toEqual(updatedGoal);

      // Delete the goal
      const deleteResult = await EmployeeGoal.delete(createdGoal.id);
      expect(deleteResult).toBe(true);

      // Verify deletion
      const deletedGoal = await EmployeeGoal.get(createdGoal.id);
      expect(deletedGoal).toBeNull();

      const emptyList = await EmployeeGoal.list();
      expect(emptyList).toHaveLength(0);
    });

    it('should get goals by team member', async () => {
      // Create goals for different team members
      const goal1 = await EmployeeGoal.create({
        employeeId: 'team-member-1',
        title: 'React Goal',
        developmentNeed: 'Frontend',
        developmentActivity: 'Course',
        developmentGoalDescription: 'Learn React'
      });

      const goal2 = await EmployeeGoal.create({
        employeeId: 'team-member-2',
        title: 'Node.js Goal',
        developmentNeed: 'Backend',
        developmentActivity: 'Project',
        developmentGoalDescription: 'Learn Node.js'
      });

      const goal3 = await EmployeeGoal.create({
        employeeId: 'team-member-1',
        title: 'TypeScript Goal',
        developmentNeed: 'Frontend',
        developmentActivity: 'Practice',
        developmentGoalDescription: 'Learn TypeScript'
      });

      // Get goals for team-member-1
      const member1Goals = await EmployeeGoal.getByTeamMember('team-member-1');
      expect(member1Goals).toHaveLength(2);
      expect(member1Goals.map(g => g.id).sort()).toEqual([goal1.id, goal3.id].sort());

      // Get goals for team-member-2
      const member2Goals = await EmployeeGoal.getByTeamMember('team-member-2');
      expect(member2Goals).toHaveLength(1);
      expect(member2Goals[0].id).toBe(goal2.id);

      // Get goals for non-existent member
      const noGoals = await EmployeeGoal.getByTeamMember('non-existent');
      expect(noGoals).toHaveLength(0);
    });

    it('should handle validation errors properly', async () => {
      // Test missing required fields
      await expect(EmployeeGoal.create({
        title: 'Incomplete Goal'
        // Missing required fields
      })).rejects.toThrow('employeeId is required');

      await expect(EmployeeGoal.create({
        employeeId: 'team-member-1'
        // Missing title
      })).rejects.toThrow('title is required');

      await expect(EmployeeGoal.create({
        employeeId: 'team-member-1',
        title: 'Goal Title'
        // Missing other required fields
      })).rejects.toThrow('developmentNeed is required');
    });

    it('should search goals by text', async () => {
      // Create goals with different content
      await EmployeeGoal.create({
        employeeId: 'team-member-1',
        title: 'React Development',
        developmentNeed: 'Frontend Skills',
        developmentActivity: 'Online Course',
        developmentGoalDescription: 'Master React hooks and context'
      });

      await EmployeeGoal.create({
        employeeId: 'team-member-2',
        title: 'Node.js Backend',
        developmentNeed: 'Server Development',
        developmentActivity: 'Build API',
        developmentGoalDescription: 'Create RESTful APIs with Express'
      });

      await EmployeeGoal.create({
        employeeId: 'team-member-3',
        title: 'Database Design',
        developmentNeed: 'Data Management',
        developmentActivity: 'Practice',
        developmentGoalDescription: 'Learn advanced React query patterns'
      });

      // Search for 'React' should return 2 goals
      const reactGoals = await EmployeeGoal.search('React');
      expect(reactGoals).toHaveLength(2);

      // Search for 'API' should return 1 goal
      const apiGoals = await EmployeeGoal.search('API');
      expect(apiGoals).toHaveLength(1);

      // Search for non-existent term should return empty array
      const noResults = await EmployeeGoal.search('Python');
      expect(noResults).toHaveLength(0);

      // Empty search should return empty array
      const emptySearch = await EmployeeGoal.search('');
      expect(emptySearch).toHaveLength(0);
    });
  });

  describe('Service Layer Integration', () => {
    it('should work with EmployeeGoalsService', async () => {
      // Test service methods work with entity layer
      const goalData = {
        employeeId: 'team-member-1',
        title: 'Service Integration Test',
        developmentNeed: 'Testing',
        developmentActivity: 'Integration Testing',
        developmentGoalDescription: 'Test service and entity integration'
      };

      // Create through service
      const createdGoal = await EmployeeGoalsService.createGoal(goalData);
      expect(createdGoal).toMatchObject(goalData);

      // Get through service
      const retrievedGoal = await EmployeeGoalsService.getGoalById(createdGoal.id);
      expect(retrievedGoal).toEqual(createdGoal);

      // Get by employee through service
      const employeeGoals = await EmployeeGoalsService.getGoalsByEmployee('team-member-1');
      expect(employeeGoals).toHaveLength(1);
      expect(employeeGoals[0]).toEqual(createdGoal);

      // Search through service
      const searchResults = await EmployeeGoalsService.searchGoals('Integration');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0]).toEqual(createdGoal);

      // Update through service
      const updatedGoal = await EmployeeGoalsService.updateGoal(createdGoal.id, {
        status: 'completed'
      });
      expect(updatedGoal.status).toBe('completed');

      // Get statistics through service
      const stats = await EmployeeGoalsService.getGoalsStatistics();
      expect(stats.total).toBe(1);
      expect(stats.byStatus.completed).toBe(1);
      expect(stats.byEmployee['team-member-1']).toBe(1);

      // Delete through service
      const deleteResult = await EmployeeGoalsService.deleteGoal(createdGoal.id);
      expect(deleteResult).toBe(true);

      // Verify deletion
      const deletedGoal = await EmployeeGoalsService.getGoalById(createdGoal.id);
      expect(deletedGoal).toBeNull();
    });

    it('should handle bulk operations', async () => {
      const goalsData = [
        {
          employeeId: 'team-member-1',
          title: 'Goal 1',
          developmentNeed: 'Skill 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        },
        {
          employeeId: 'team-member-2',
          title: 'Goal 2',
          developmentNeed: 'Skill 2',
          developmentActivity: 'Activity 2',
          developmentGoalDescription: 'Description 2'
        }
      ];

      const result = await EmployeeGoalsService.bulkCreateGoals(goalsData);
      
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      // Verify goals were created
      const allGoals = await EmployeeGoalsService.getAllGoals();
      expect(allGoals).toHaveLength(2);
    });
  });
});