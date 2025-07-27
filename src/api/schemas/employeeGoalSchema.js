/**
 * Zod validation schema for Employee Goals
 * Defines structure and validation rules for employee development goals
 */

import { z } from 'zod';

// Valid status values for employee goals
export const GoalStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused'
};

// Base schema for employee goal creation
export const createEmployeeGoalSchema = z.object({
  employeeId: z.string()
    .min(1, 'Employee ID is required')
    .describe('ID of the team member this goal belongs to'),
  
  title: z.string()
    .min(1, 'Goal title is required')
    .max(200, 'Goal title must be less than 200 characters')
    .describe('Main goal title'),
  
  developmentNeed: z.string()
    .min(1, 'Development need is required')
    .max(500, 'Development need must be less than 500 characters')
    .describe('Skills or areas needing improvement'),
  
  developmentActivity: z.string()
    .min(1, 'Development activity is required')
    .max(500, 'Development activity must be less than 500 characters')
    .describe('Specific planned activities to achieve the goal'),
  
  developmentGoalDescription: z.string()
    .min(1, 'Goal description is required')
    .max(1000, 'Goal description must be less than 1000 characters')
    .describe('Detailed goal breakdown and expectations'),
  
  status: z.enum([GoalStatus.ACTIVE, GoalStatus.COMPLETED, GoalStatus.PAUSED])
    .optional()
    .default(GoalStatus.ACTIVE)
    .describe('Current status of the goal'),
  
  importSource: z.string()
    .optional()
    .describe('Source system identifier if imported from external system')
});

// Schema for updating an existing employee goal
export const updateEmployeeGoalSchema = createEmployeeGoalSchema.partial().extend({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// Complete schema including system-generated fields
export const employeeGoalSchema = createEmployeeGoalSchema.extend({
  id: z.string()
    .describe('Unique identifier for the goal'),
  
  createdAt: z.string()
    .datetime()
    .describe('ISO timestamp of goal creation'),
  
  updatedAt: z.string()
    .datetime()
    .describe('ISO timestamp of last modification')
});

// Schema for bulk goal import
export const bulkGoalImportSchema = z.object({
  goals: z.array(createEmployeeGoalSchema)
    .min(1, 'At least one goal is required')
    .max(100, 'Cannot import more than 100 goals at once'),
  
  importSource: z.string()
    .optional()
    .describe('Source identifier for tracking imported data')
});

// Schema for goal search/filter parameters
export const goalSearchSchema = z.object({
  searchText: z.string()
    .optional()
    .describe('Text to search in goal title and description'),
  
  status: z.enum([GoalStatus.ACTIVE, GoalStatus.COMPLETED, GoalStatus.PAUSED])
    .optional()
    .describe('Filter by goal status'),
  
  employeeId: z.string()
    .optional()
    .describe('Filter by specific employee'),
  
  importSource: z.string()
    .optional()
    .describe('Filter by import source')
});

// Type definitions for TypeScript-like usage
export const EmployeeGoalTypes = {
  CreateEmployeeGoal: createEmployeeGoalSchema,
  UpdateEmployeeGoal: updateEmployeeGoalSchema,
  EmployeeGoal: employeeGoalSchema,
  BulkGoalImport: bulkGoalImportSchema,
  GoalSearch: goalSearchSchema
};

// Validation helper functions
export const validateEmployeeGoal = (data) => {
  return createEmployeeGoalSchema.parse(data);
};

export const validateEmployeeGoalUpdate = (data) => {
  return updateEmployeeGoalSchema.parse(data);
};

export const validateGoalSearch = (params) => {
  return goalSearchSchema.parse(params);
};

export const validateBulkImport = (data) => {
  return bulkGoalImportSchema.parse(data);
};

// Status validation helper
export const isValidGoalStatus = (status) => {
  return Object.values(GoalStatus).includes(status);
};

export default {
  createEmployeeGoalSchema,
  updateEmployeeGoalSchema,
  employeeGoalSchema,
  bulkGoalImportSchema,
  goalSearchSchema,
  GoalStatus,
  EmployeeGoalTypes,
  validateEmployeeGoal,
  validateEmployeeGoalUpdate,
  validateGoalSearch,
  validateBulkImport,
  isValidGoalStatus
};