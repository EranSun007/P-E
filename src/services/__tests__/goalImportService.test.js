/**
 * Tests for Goal Import Service
 * Comprehensive test suite for CSV/JSON goal import functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import GoalImportService from '../goalImportService.js';
import EmployeeGoalsService from '../employeeGoalsService.js';

// Mock dependencies
vi.mock('../employeeGoalsService.js');

describe('GoalImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCSV()', () => {
    it('should parse valid CSV data with headers', async () => {
      const csvData = `employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription
emp-1,Improve React skills,Frontend development,Complete React course,Learn advanced React patterns
emp-2,Learn TypeScript,Type safety,Complete TypeScript tutorial,Master type definitions`;

      const result = await GoalImportService.parseCSV(csvData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        title: 'Improve React skills',
        developmentNeed: 'Frontend development',
        developmentActivity: 'Complete React course',
        developmentGoalDescription: 'Learn advanced React patterns'
      });
      expect(result[1]).toEqual({
        employeeId: 'emp-2',
        title: 'Learn TypeScript',
        developmentNeed: 'Type safety',
        developmentActivity: 'Complete TypeScript tutorial',
        developmentGoalDescription: 'Master type definitions'
      });
    });

    it('should handle CSV with quoted fields containing commas', async () => {
      const csvData = `employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription
emp-1,"Improve React, Vue skills","Frontend development, UI","Complete React course, Vue tutorial","Learn advanced patterns, components"`;

      const result = await GoalImportService.parseCSV(csvData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        title: 'Improve React, Vue skills',
        developmentNeed: 'Frontend development, UI',
        developmentActivity: 'Complete React course, Vue tutorial',
        developmentGoalDescription: 'Learn advanced patterns, components'
      });
    });

    it('should handle empty CSV data', async () => {
      const csvData = '';

      const result = await GoalImportService.parseCSV(csvData);

      expect(result).toEqual([]);
    });

    it('should handle CSV with only headers', async () => {
      const csvData = 'employeeId,title,developmentNeed,developmentActivity,developmentGoalDescription';

      const result = await GoalImportService.parseCSV(csvData);

      expect(result).toEqual([]);
    });

    it('should handle CSV with missing fields gracefully', async () => {
      const csvData = `employeeId,title,developmentNeed
emp-1,Improve React skills,Frontend development`;

      const result = await GoalImportService.parseCSV(csvData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        title: 'Improve React skills',
        developmentNeed: 'Frontend development',
        developmentActivity: '',
        developmentGoalDescription: ''
      });
    });

    it('should throw error for malformed CSV', async () => {
      const csvData = `employeeId,title,developmentNeed
emp-1,"Unclosed quote,Frontend development`;

      await expect(GoalImportService.parseCSV(csvData))
        .rejects.toThrow('Invalid CSV format');
    });
  });

  describe('parseJSON()', () => {
    it('should parse valid JSON array', async () => {
      const jsonData = JSON.stringify([
        {
          employeeId: 'emp-1',
          title: 'Improve React skills',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns'
        },
        {
          employeeId: 'emp-2',
          title: 'Learn TypeScript',
          developmentNeed: 'Type safety',
          developmentActivity: 'Complete TypeScript tutorial',
          developmentGoalDescription: 'Master type definitions'
        }
      ]);

      const result = await GoalImportService.parseJSON(jsonData);

      expect(result).toHaveLength(2);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[1].employeeId).toBe('emp-2');
    });

    it('should handle empty JSON array', async () => {
      const jsonData = '[]';

      const result = await GoalImportService.parseJSON(jsonData);

      expect(result).toEqual([]);
    });

    it('should throw error for invalid JSON', async () => {
      const jsonData = '{ invalid json }';

      await expect(GoalImportService.parseJSON(jsonData))
        .rejects.toThrow('Invalid JSON format');
    });

    it('should throw error for non-array JSON', async () => {
      const jsonData = '{"employeeId": "emp-1", "title": "Goal"}';

      await expect(GoalImportService.parseJSON(jsonData))
        .rejects.toThrow('JSON data must be an array');
    });
  });

  describe('mapFields()', () => {
    it('should map fields according to field mapping configuration', () => {
      const rawData = [
        {
          'Employee ID': 'emp-1',
          'Goal Title': 'Improve React skills',
          'Development Need': 'Frontend development',
          'Activities': 'Complete React course',
          'Description': 'Learn advanced React patterns'
        }
      ];

      const fieldMapping = {
        employeeId: 'Employee ID',
        title: 'Goal Title',
        developmentNeed: 'Development Need',
        developmentActivity: 'Activities',
        developmentGoalDescription: 'Description'
      };

      const result = GoalImportService.mapFields(rawData, fieldMapping);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        title: 'Improve React skills',
        developmentNeed: 'Frontend development',
        developmentActivity: 'Complete React course',
        developmentGoalDescription: 'Learn advanced React patterns'
      });
    });

    it('should handle missing mapped fields with empty strings', () => {
      const rawData = [
        {
          'Employee ID': 'emp-1',
          'Goal Title': 'Improve React skills'
          // Missing other fields
        }
      ];

      const fieldMapping = {
        employeeId: 'Employee ID',
        title: 'Goal Title',
        developmentNeed: 'Development Need',
        developmentActivity: 'Activities',
        developmentGoalDescription: 'Description'
      };

      const result = GoalImportService.mapFields(rawData, fieldMapping);

      expect(result[0]).toEqual({
        employeeId: 'emp-1',
        title: 'Improve React skills',
        developmentNeed: '',
        developmentActivity: '',
        developmentGoalDescription: ''
      });
    });

    it('should handle identity mapping when no field mapping provided', () => {
      const rawData = [
        {
          employeeId: 'emp-1',
          title: 'Improve React skills',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns'
        }
      ];

      const result = GoalImportService.mapFields(rawData);

      expect(result).toEqual(rawData);
    });
  });

  describe('validateImportData()', () => {
    it('should validate array of goal data', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'Improve React skills',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns'
        }
      ];

      const result = await GoalImportService.validateImportData(goalData);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
      expect(result.valid[0].employeeId).toBe('emp-1');
    });

    it('should separate valid and invalid goal data', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'Improve React skills',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns'
        },
        {
          // Missing required fields
          title: 'Invalid Goal'
        },
        {
          employeeId: 'emp-2',
          title: 'Learn TypeScript',
          developmentNeed: 'Type safety',
          developmentActivity: 'Complete TypeScript tutorial',
          developmentGoalDescription: 'Master type definitions'
        }
      ];

      const result = await GoalImportService.validateImportData(goalData);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].data.title).toBe('Invalid Goal');
      expect(result.invalid[0].error).toContain('required');
    });

    it('should handle empty data array', async () => {
      const result = await GoalImportService.validateImportData([]);

      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });
  });

  describe('detectDuplicates()', () => {
    it('should detect duplicate goals by employeeId and title', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'Improve React skills',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns'
        }
      ];

      // Mock existing goals
      EmployeeGoalsService.getAllGoals.mockResolvedValue([
        {
          id: 'existing-1',
          employeeId: 'emp-1',
          title: 'Improve React skills',
          status: 'active'
        }
      ]);

      const result = await GoalImportService.detectDuplicates(goalData);

      expect(result.duplicates).toHaveLength(1);
      expect(result.unique).toHaveLength(0);
      expect(result.duplicates[0].existingGoal.id).toBe('existing-1');
    });

    it('should identify unique goals for import', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'New React Goal',
          developmentNeed: 'Frontend development',
          developmentActivity: 'Complete React course',
          developmentGoalDescription: 'Learn advanced React patterns'
        }
      ];

      // Mock existing goals
      EmployeeGoalsService.getAllGoals.mockResolvedValue([
        {
          id: 'existing-1',
          employeeId: 'emp-1',
          title: 'Different Goal',
          status: 'active'
        }
      ]);

      const result = await GoalImportService.detectDuplicates(goalData);

      expect(result.duplicates).toHaveLength(0);
      expect(result.unique).toHaveLength(1);
      expect(result.unique[0].title).toBe('New React Goal');
    });

    it('should handle empty existing goals', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'New Goal',
          developmentNeed: 'Development',
          developmentActivity: 'Activity',
          developmentGoalDescription: 'Description'
        }
      ];

      EmployeeGoalsService.getAllGoals.mockResolvedValue([]);

      const result = await GoalImportService.detectDuplicates(goalData);

      expect(result.duplicates).toHaveLength(0);
      expect(result.unique).toHaveLength(1);
    });
  });

  describe('importGoals()', () => {
    it('should import valid unique goals successfully', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'New Goal',
          developmentNeed: 'Development',
          developmentActivity: 'Activity',
          developmentGoalDescription: 'Description'
        }
      ];

      const importOptions = {
        source: 'CSV Import',
        skipDuplicates: true
      };

      // Mock dependencies
      EmployeeGoalsService.getAllGoals.mockResolvedValue([]);
      EmployeeGoalsService.bulkCreateGoals.mockResolvedValue({
        successful: [{ id: 'goal-1', ...goalData[0] }],
        failed: []
      });

      const result = await GoalImportService.importGoals(goalData, importOptions);

      expect(result.imported).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(EmployeeGoalsService.bulkCreateGoals).toHaveBeenCalledWith([
        { ...goalData[0], importSource: 'CSV Import', status: 'active' }
      ]);
    });

    it('should skip duplicates when skipDuplicates is true', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'Existing Goal',
          developmentNeed: 'Development',
          developmentActivity: 'Activity',
          developmentGoalDescription: 'Description'
        }
      ];

      const importOptions = {
        source: 'CSV Import',
        skipDuplicates: true
      };

      // Mock existing goals
      EmployeeGoalsService.getAllGoals.mockResolvedValue([
        {
          id: 'existing-1',
          employeeId: 'emp-1',
          title: 'Existing Goal',
          status: 'active'
        }
      ]);

      const result = await GoalImportService.importGoals(goalData, importOptions);

      expect(result.imported).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(EmployeeGoalsService.bulkCreateGoals).not.toHaveBeenCalled();
    });

    it('should handle partial import failures', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'Valid Goal',
          developmentNeed: 'Development',
          developmentActivity: 'Activity',
          developmentGoalDescription: 'Description'
        }
      ];

      const importOptions = {
        source: 'CSV Import',
        skipDuplicates: true
      };

      // Mock dependencies
      EmployeeGoalsService.getAllGoals.mockResolvedValue([]);
      EmployeeGoalsService.bulkCreateGoals.mockResolvedValue({
        successful: [],
        failed: [
          {
            data: goalData[0],
            error: 'Database error',
            index: 0
          }
        ]
      });

      const result = await GoalImportService.importGoals(goalData, importOptions);

      expect(result.imported).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Database error');
    });

    it('should handle validation errors', async () => {
      const goalData = [
        {
          // Missing required fields
          title: 'Invalid Goal'
        }
      ];

      const importOptions = {
        source: 'CSV Import',
        skipDuplicates: true
      };

      const result = await GoalImportService.importGoals(goalData, importOptions);

      expect(result.imported).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('required');
    });
  });

  describe('getFieldSuggestions()', () => {
    it('should suggest field mappings based on header similarity', () => {
      const headers = ['Employee ID', 'Goal Title', 'Need', 'Activity', 'Description'];

      const result = GoalImportService.getFieldSuggestions(headers);

      expect(result).toEqual({
        employeeId: 'Employee ID',
        title: 'Goal Title',
        developmentNeed: 'Need',
        developmentActivity: 'Activity',
        developmentGoalDescription: 'Description'
      });
    });

    it('should handle partial header matches', () => {
      const headers = ['ID', 'Title', 'Unknown Field'];

      const result = GoalImportService.getFieldSuggestions(headers);

      expect(result.employeeId).toBe('ID');
      expect(result.title).toBe('Title');
      expect(result.developmentNeed).toBeUndefined();
    });

    it('should return empty suggestions for no matching headers', () => {
      const headers = ['Col1', 'Col2', 'Col3'];

      const result = GoalImportService.getFieldSuggestions(headers);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('generateImportPreview()', () => {
    it('should generate preview with statistics and samples', async () => {
      const goalData = [
        {
          employeeId: 'emp-1',
          title: 'Goal 1',
          developmentNeed: 'Need 1',
          developmentActivity: 'Activity 1',
          developmentGoalDescription: 'Description 1'
        },
        {
          employeeId: 'emp-2',
          title: 'Goal 2',
          developmentNeed: 'Need 2',
          developmentActivity: 'Activity 2',
          developmentGoalDescription: 'Description 2'
        }
      ];

      EmployeeGoalsService.getAllGoals.mockResolvedValue([]);

      const result = await GoalImportService.generateImportPreview(goalData);

      expect(result.totalGoals).toBe(2);
      expect(result.validGoals).toBe(2);
      expect(result.invalidGoals).toBe(0);
      expect(result.duplicateGoals).toBe(0);
      expect(result.uniqueGoals).toBe(2);
      expect(result.sampleGoals).toHaveLength(2);
    });

    it('should limit sample size to maximum', async () => {
      const goalData = Array.from({ length: 15 }, (_, i) => ({
        employeeId: `emp-${i}`,
        title: `Goal ${i}`,
        developmentNeed: `Need ${i}`,
        developmentActivity: `Activity ${i}`,
        developmentGoalDescription: `Description ${i}`
      }));

      EmployeeGoalsService.getAllGoals.mockResolvedValue([]);

      const result = await GoalImportService.generateImportPreview(goalData);

      expect(result.totalGoals).toBe(15);
      expect(result.sampleGoals).toHaveLength(10); // Max sample size
    });
  });
});