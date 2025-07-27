// src/services/__tests__/globalSearchService.test.js
// Tests for global search service

import { describe, it, expect, beforeEach, vi } from 'vitest';
import GlobalSearchService from '../globalSearchService.js';
import { Task, TeamMember, Project, Stakeholder, Peer } from '@/api/entities.js';
import { EmployeeGoalsService } from '../employeeGoalsService.js';

// Mock all dependencies
vi.mock('@/api/entities.js', () => ({
  Task: {
    list: vi.fn()
  },
  TeamMember: {
    list: vi.fn()
  },
  Project: {
    list: vi.fn()
  },
  Stakeholder: {
    list: vi.fn()
  },
  Peer: {
    list: vi.fn()
  }
}));

vi.mock('../employeeGoalsService.js', () => ({
  EmployeeGoalsService: {
    searchGoalsForGlobalResults: vi.fn(),
    getAllGoals: vi.fn()
  }
}));

describe('GlobalSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return empty results for empty search term', async () => {
      const result = await GlobalSearchService.search('');
      
      expect(result).toEqual({
        results: {},
        totalCount: 0,
        searchTerm: ''
      });
    });

    it('should search across all data types by default', async () => {
      // Mock data
      Task.list.mockResolvedValue([
        { id: '1', title: 'Test task', description: 'A test task', tags: ['work'] }
      ]);
      
      EmployeeGoalsService.searchGoalsForGlobalResults.mockResolvedValue([
        { type: 'goal', id: 'g1', title: 'Test goal', description: 'A test goal' }
      ]);
      
      TeamMember.list.mockResolvedValue([
        { id: 'm1', name: 'John Test', email: 'john@test.com', role: 'Developer' }
      ]);
      
      Project.list.mockResolvedValue([
        { id: 'p1', name: 'Test project', description: 'A test project', status: 'active' }
      ]);
      
      Stakeholder.list.mockResolvedValue([
        { id: 's1', name: 'Test stakeholder', role: 'Manager', organization: 'TestCorp' }
      ]);
      
      Peer.list.mockResolvedValue([
        { id: 'peer1', name: 'Test peer', role: 'Engineer', organization: 'TestOrg' }
      ]);

      const result = await GlobalSearchService.search('test');

      expect(result.searchTerm).toBe('test');
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.results.tasks).toBeDefined();
      expect(result.results.goals).toBeDefined();
      expect(result.results.team_members).toBeDefined();
      expect(result.results.projects).toBeDefined();
      expect(result.results.stakeholders).toBeDefined();
      expect(result.results.peers).toBeDefined();
    });

    it('should limit search to specified types', async () => {
      Task.list.mockResolvedValue([
        { id: '1', title: 'Test task', description: 'A test task', tags: ['work'] }
      ]);

      const result = await GlobalSearchService.search('test', { types: ['tasks'] });

      expect(result.results.tasks).toBeDefined();
      expect(result.results.goals).toBeUndefined();
      expect(result.results.team_members).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      Task.list.mockRejectedValue(new Error('Database error'));

      const result = await GlobalSearchService.search('test');

      expect(result.error).toBe('Search failed');
      expect(result.totalCount).toBe(0);
    });
  });

  describe('searchTasks', () => {
    it('should search tasks by title, description, and tags', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Project planning',
          description: 'Plan the project timeline',
          tags: ['planning', 'management']
        },
        {
          id: '2', 
          title: 'Code review',
          description: 'Review pull requests',
          tags: ['development']
        },
        {
          id: '3',
          title: 'Team meeting',
          description: 'Weekly project sync',
          tags: ['planning']
        }
      ];

      Task.list.mockResolvedValue(mockTasks);

      const results = await GlobalSearchService.searchTasks('project');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Project planning'); // Higher relevance
      expect(results[1].title).toBe('Team meeting');
    });

    it('should calculate relevance scores correctly', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'test task', // Title match = 3 points
          description: 'description',
          tags: []
        },
        {
          id: '2',
          title: 'other task',
          description: 'test description', // Description match = 2 points
          tags: []
        },
        {
          id: '3',
          title: 'another task',
          description: 'description',
          tags: ['test'] // Tag match = 1 point
        }
      ];

      Task.list.mockResolvedValue(mockTasks);

      const results = await GlobalSearchService.searchTasks('test');

      expect(results[0].relevanceScore).toBe(3); // Title match
      expect(results[1].relevanceScore).toBe(2); // Description match
      expect(results[2].relevanceScore).toBe(1); // Tag match
    });

    it('should handle missing fields gracefully', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'test task',
          // missing description and tags
        }
      ];

      Task.list.mockResolvedValue(mockTasks);

      const results = await GlobalSearchService.searchTasks('test');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('test task');
      expect(results[0].description).toBe('No description');
    });
  });

  describe('searchGoals', () => {
    it('should delegate to EmployeeGoalsService', async () => {
      const mockGoals = [
        { type: 'goal', id: 'g1', title: 'Leadership goal', description: 'Develop leadership skills' }
      ];

      EmployeeGoalsService.searchGoalsForGlobalResults.mockResolvedValue(mockGoals);

      const results = await GlobalSearchService.searchGoals('leadership');

      expect(EmployeeGoalsService.searchGoalsForGlobalResults).toHaveBeenCalledWith('leadership');
      expect(results).toEqual(mockGoals);
    });

    it('should handle goals service errors', async () => {
      EmployeeGoalsService.searchGoalsForGlobalResults.mockRejectedValue(new Error('Goals error'));

      const results = await GlobalSearchService.searchGoals('test');

      expect(results).toEqual([]);
    });
  });

  describe('searchTeamMembers', () => {
    it('should search by name, email, role, and department', async () => {
      const mockMembers = [
        {
          id: 'm1',
          name: 'John Developer',
          email: 'john@company.com',
          role: 'Senior Developer',
          department: 'Engineering'
        },
        {
          id: 'm2',
          name: 'Jane Manager',
          email: 'jane@company.com',
          role: 'Engineering Manager',
          department: 'Engineering'
        }
      ];

      TeamMember.list.mockResolvedValue(mockMembers);

      const results = await GlobalSearchService.searchTeamMembers('developer');

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('John Developer'); // Higher relevance due to name match
    });
  });

  describe('getSearchSuggestions', () => {
    it('should aggregate suggestions from all data sources', async () => {
      Task.list.mockResolvedValue([
        { title: 'Project planning', tags: ['planning', 'project'] }
      ]);

      EmployeeGoalsService.getAllGoals.mockResolvedValue([
        { title: 'Leadership development', developmentNeed: 'Management skills' }
      ]);

      Project.list.mockResolvedValue([
        { name: 'Mobile App' }
      ]);

      const suggestions = await GlobalSearchService.getSearchSuggestions();

      expect(suggestions).toContain('Project planning');
      expect(suggestions).toContain('planning');
      expect(suggestions).toContain('Leadership development');
      expect(suggestions).toContain('Mobile App');
    });

    it('should handle errors and return empty array', async () => {
      Task.list.mockRejectedValue(new Error('Database error'));

      const suggestions = await GlobalSearchService.getSearchSuggestions();

      expect(suggestions).toEqual([]);
    });
  });
});