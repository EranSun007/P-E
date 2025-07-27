/**
 * EmployeeGoalsService
 * Service layer for managing employee development goals
 * Provides CRUD operations and business logic for goal management
 */

import { localClient } from '../api/localClient.js';
import { 
  validateEmployeeGoal, 
  validateEmployeeGoalUpdate, 
  validateGoalSearch,
  validateBulkImport,
  GoalStatus,
  isValidGoalStatus 
} from '../api/schemas/employeeGoalSchema.js';

class EmployeeGoalsService {
  /**
   * Get all employee goals
   * @returns {Promise<Array>} Array of all goals
   */
  static async getAllGoals() {
    try {
      return await localClient.entities.EmployeeGoal.list();
    } catch (error) {
      console.error('Error fetching all goals:', error);
      throw error;
    }
  }

  /**
   * Get specific goal by ID
   * @param {string} id - Goal ID
   * @returns {Promise<Object|null>} Goal object or null if not found
   */
  static async getGoalById(id) {
    try {
      if (!id) {
        throw new Error('Goal ID is required');
      }
      return await localClient.entities.EmployeeGoal.get(id);
    } catch (error) {
      console.error(`Error fetching goal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get goals for a specific employee
   * @param {string} employeeId - Employee/Team member ID
   * @returns {Promise<Array>} Array of goals for the employee
   */
  static async getGoalsByEmployee(employeeId) {
    try {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }
      return await localClient.entities.EmployeeGoal.getByTeamMember(employeeId);
    } catch (error) {
      console.error(`Error fetching goals for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new employee goal
   * @param {Object} goalData - Goal data to create
   * @returns {Promise<Object>} Created goal object
   */
  static async createGoal(goalData) {
    try {
      // Basic validation first
      if (!goalData.employeeId) {
        throw new Error('employeeId is required');
      }
      
      if (!goalData.title) {
        throw new Error('title is required');
      }

      // Validate the goal data with Zod
      const validatedData = validateEmployeeGoal(goalData);

      return await localClient.entities.EmployeeGoal.create(validatedData);
    } catch (error) {
      console.error('Error creating goal:', error);
      
      // Re-throw with better error messages for missing fields
      if (error.name === 'ZodError') {
        const firstError = error.issues[0];
        if (firstError && firstError.path.length > 0) {
          throw new Error(`${firstError.path[0]} is required`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Update an existing goal
   * @param {string} id - Goal ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated goal object
   */
  static async updateGoal(id, updates) {
    try {
      if (!id) {
        throw new Error('Goal ID is required');
      }

      // Validate status if provided
      if (updates.status && !isValidGoalStatus(updates.status)) {
        throw new Error('Invalid status value. Must be active, completed, or paused');
      }

      // Validate the update data
      const validatedUpdates = validateEmployeeGoalUpdate(updates);

      return await localClient.entities.EmployeeGoal.update(id, validatedUpdates);
    } catch (error) {
      console.error(`Error updating goal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a goal
   * @param {string} id - Goal ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteGoal(id) {
    try {
      if (!id) {
        throw new Error('Goal ID is required');
      }
      return await localClient.entities.EmployeeGoal.delete(id);
    } catch (error) {
      console.error(`Error deleting goal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get goals filtered by status
   * @param {string} status - Goal status (active, completed, paused)
   * @returns {Promise<Array>} Array of goals with specified status
   */
  static async getGoalsByStatus(status) {
    try {
      if (!isValidGoalStatus(status)) {
        throw new Error('Invalid status value. Must be active, completed, or paused');
      }

      const allGoals = await this.getAllGoals();
      return allGoals.filter(goal => goal.status === status);
    } catch (error) {
      console.error(`Error fetching goals by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Search goals by text in title and description
   * @param {string} searchText - Text to search for
   * @returns {Promise<Array>} Array of matching goals
   */
  static async searchGoals(searchText) {
    try {
      if (!searchText || typeof searchText !== 'string') {
        return [];
      }

      const allGoals = await this.getAllGoals();
      const searchLower = searchText.toLowerCase();

      return allGoals.filter(goal => {
        const titleMatch = goal.title?.toLowerCase().includes(searchLower);
        const descriptionMatch = goal.developmentGoalDescription?.toLowerCase().includes(searchLower);
        const needMatch = goal.developmentNeed?.toLowerCase().includes(searchLower);
        const activityMatch = goal.developmentActivity?.toLowerCase().includes(searchLower);

        return titleMatch || descriptionMatch || needMatch || activityMatch;
      });
    } catch (error) {
      console.error(`Error searching goals with text "${searchText}":`, error);
      throw error;
    }
  }

  /**
   * Create multiple goals at once
   * @param {Array} goalsData - Array of goal data objects
   * @returns {Promise<Object>} Object with successful and failed creations
   */
  static async bulkCreateGoals(goalsData) {
    try {
      if (!Array.isArray(goalsData) || goalsData.length === 0) {
        throw new Error('Goals data must be a non-empty array');
      }

      const results = {
        successful: [],
        failed: []
      };

      for (let i = 0; i < goalsData.length; i++) {
        try {
          const goal = await this.createGoal(goalsData[i]);
          results.successful.push(goal);
        } catch (error) {
          results.failed.push({
            data: goalsData[i],
            error: error.message,
            index: i
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk goal creation:', error);
      throw error;
    }
  }

  /**
   * Get statistics about goals
   * @returns {Promise<Object>} Statistics object
   */
  static async getGoalsStatistics() {
    try {
      const allGoals = await this.getAllGoals();

      const stats = {
        total: allGoals.length,
        byStatus: {
          active: 0,
          completed: 0,
          paused: 0
        },
        byEmployee: {}
      };

      allGoals.forEach(goal => {
        // Count by status
        if (goal.status && stats.byStatus.hasOwnProperty(goal.status)) {
          stats.byStatus[goal.status]++;
        }

        // Count by employee
        if (goal.employeeId) {
          stats.byEmployee[goal.employeeId] = (stats.byEmployee[goal.employeeId] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error generating goal statistics:', error);
      throw error;
    }
  }

  /**
   * Advanced search with multiple filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Array of matching goals
   */
  static async advancedSearch(searchParams = {}) {
    try {
      const validatedParams = validateGoalSearch(searchParams);
      let results = await this.getAllGoals();

      // Filter by search text
      if (validatedParams.searchText) {
        results = await this.searchGoals(validatedParams.searchText);
      }

      // Filter by status
      if (validatedParams.status) {
        results = results.filter(goal => goal.status === validatedParams.status);
      }

      // Filter by employee
      if (validatedParams.employeeId) {
        results = results.filter(goal => goal.employeeId === validatedParams.employeeId);
      }

      // Filter by import source
      if (validatedParams.importSource) {
        results = results.filter(goal => goal.importSource === validatedParams.importSource);
      }

      // Filter by creation date range
      if (validatedParams.createdAfter) {
        const afterDate = new Date(validatedParams.createdAfter);
        results = results.filter(goal => {
          try {
            return new Date(goal.createdAt) >= afterDate;
          } catch {
            return false;
          }
        });
      }

      if (validatedParams.createdBefore) {
        const beforeDate = new Date(validatedParams.createdBefore);
        results = results.filter(goal => {
          try {
            return new Date(goal.createdAt) <= beforeDate;
          } catch {
            return false;
          }
        });
      }

      // Filter by update date range
      if (validatedParams.updatedAfter) {
        const afterDate = new Date(validatedParams.updatedAfter);
        results = results.filter(goal => {
          try {
            return new Date(goal.updatedAt) >= afterDate;
          } catch {
            return false;
          }
        });
      }

      if (validatedParams.updatedBefore) {
        const beforeDate = new Date(validatedParams.updatedBefore);
        results = results.filter(goal => {
          try {
            return new Date(goal.updatedAt) <= beforeDate;
          } catch {
            return false;
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error in advanced search:', error);
      throw error;
    }
  }

  /**
   * Mark goal as completed
   * @param {string} id - Goal ID
   * @returns {Promise<Object>} Updated goal object
   */
  static async completeGoal(id) {
    try {
      return await this.updateGoal(id, { 
        status: GoalStatus.COMPLETED,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error completing goal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Pause a goal
   * @param {string} id - Goal ID
   * @returns {Promise<Object>} Updated goal object
   */
  static async pauseGoal(id) {
    try {
      return await this.updateGoal(id, { 
        status: GoalStatus.PAUSED,
        pausedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error pausing goal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Reactivate a paused goal
   * @param {string} id - Goal ID
   * @returns {Promise<Object>} Updated goal object
   */
  static async reactivateGoal(id) {
    try {
      return await this.updateGoal(id, { 
        status: GoalStatus.ACTIVE,
        reactivatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error reactivating goal ${id}:`, error);
      throw error;
    }
  }

  // Integration Methods for Cross-Feature Functionality

  /**
   * Get goals context for one-on-one meeting preparation
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object>} Goals context for meeting
   */
  static async getGoalsForMeeting(employeeId) {
    try {
      const allGoals = await this.getGoalsByEmployee(employeeId);
      const activeGoals = allGoals.filter(goal => goal.status === 'active');
      
      const goalsSummary = {
        total: allGoals.length,
        active: allGoals.filter(g => g.status === 'active').length,
        completed: allGoals.filter(g => g.status === 'completed').length,
        paused: allGoals.filter(g => g.status === 'paused').length
      };

      const suggestedTopics = activeGoals.map(goal => 
        `${goal.developmentNeed} development progress`
      ).filter(topic => topic && topic.trim() !== ' development progress');

      return {
        activeGoals,
        goalsSummary,
        suggestedTopics
      };
    } catch (error) {
      console.error('Error getting goals for meeting:', error);
      return {
        activeGoals: [],
        goalsSummary: { total: 0, active: 0, completed: 0, paused: 0 },
        suggestedTopics: [],
        error: 'Failed to load goals for meeting context'
      };
    }
  }

  /**
   * Suggest agenda items based on employee goals
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Array>} Array of suggested agenda items
   */
  static async suggestAgendaItems(employeeId) {
    try {
      const goals = await this.getGoalsByEmployee(employeeId);
      const activeGoals = goals.filter(goal => goal.status === 'active');
      
      return activeGoals.map(goal => 
        `Discuss progress on ${goal.title} goal`
      );
    } catch (error) {
      console.error('Error suggesting agenda items:', error);
      return [];
    }
  }

  /**
   * Find goals related to a given task or topic
   * @param {string} searchTerm - Search term to match against goals
   * @returns {Promise<Array>} Array of related goals
   */
  static async findRelatedGoals(searchTerm) {
    try {
      const goals = await this.getAllGoals();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      return goals.filter(goal => 
        goal.title.toLowerCase().includes(lowerSearchTerm) ||
        goal.developmentNeed.toLowerCase().includes(lowerSearchTerm) ||
        goal.developmentActivity.toLowerCase().includes(lowerSearchTerm) ||
        goal.developmentGoalDescription.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error finding related goals:', error);
      return [];
    }
  }

  /**
   * Suggest tasks based on employee goals
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Array>} Array of suggested task titles
   */
  static async suggestTasksFromGoals(employeeId) {
    try {
      const goals = await this.getGoalsByEmployee(employeeId);
      const suggestions = [];
      
      goals.forEach(goal => {
        // Extract tasks from development activities
        if (goal.developmentActivity && goal.developmentActivity.trim()) {
          // Split on numbered points (1., 2., etc.)
          const activities = goal.developmentActivity.split(/\d+\.\s+/)
            .filter(activity => activity.trim())
            .map(activity => activity.replace(/^\d+\.\s*/, '').trim());
          
          activities.forEach(activity => {
            if (activity) {
              suggestions.push(activity);
            }
          });
        }
        
        // Extract tasks from goal descriptions
        if (goal.developmentGoalDescription && goal.developmentGoalDescription.trim()) {
          const descriptions = goal.developmentGoalDescription.split(/\d+\.\s+/)
            .filter(desc => desc.trim())
            .map(desc => desc.replace(/^\d+\.\s*/, '').trim());
          
          descriptions.forEach(desc => {
            if (desc) {
              suggestions.push(`${desc.split(' ').slice(0, 6).join(' ')} for ${goal.title}`);
            }
          });
        }
      });
      
      return [...new Set(suggestions)]; // Remove duplicates
    } catch (error) {
      console.error('Error suggesting tasks from goals:', error);
      return [];
    }
  }

  /**
   * Get analytics data for goals
   * @returns {Promise<Object>} Goals analytics
   */
  static async getGoalsAnalytics() {
    try {
      const goals = await this.getAllGoals();
      
      const statusBreakdown = {
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length,
        paused: goals.filter(g => g.status === 'paused').length
      };
      
      const completionRate = goals.length > 0 
        ? statusBreakdown.completed / goals.length 
        : 0;
      
      // Group by month for trends
      const monthlyData = {};
      goals.forEach(goal => {
        const date = new Date(goal.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });
      
      const monthlyTrends = Object.entries(monthlyData).map(([month, count]) => ({
        month,
        count
      }));
      
      return {
        totalGoals: goals.length,
        statusBreakdown,
        monthlyTrends,
        completionRate: Math.round(completionRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting goals analytics:', error);
      throw error;
    }
  }

  /**
   * Get goals progress by employee
   * @returns {Promise<Object>} Progress data by employee
   */
  static async getEmployeeGoalsProgress() {
    try {
      const goals = await this.getAllGoals();
      const employeeProgress = {};
      
      goals.forEach(goal => {
        if (!employeeProgress[goal.employeeId]) {
          employeeProgress[goal.employeeId] = {
            total: 0,
            completed: 0,
            completionRate: 0
          };
        }
        
        employeeProgress[goal.employeeId].total++;
        if (goal.status === 'completed') {
          employeeProgress[goal.employeeId].completed++;
        }
      });
      
      // Calculate completion rates
      Object.keys(employeeProgress).forEach(employeeId => {
        const progress = employeeProgress[employeeId];
        progress.completionRate = progress.total > 0 
          ? Math.round((progress.completed / progress.total) * 100) / 100
          : 0;
      });
      
      return employeeProgress;
    } catch (error) {
      console.error('Error getting employee goals progress:', error);
      throw error;
    }
  }

  /**
   * Search goals for global search results
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of search results
   */
  static async searchGoalsForGlobalResults(searchTerm) {
    try {
      const goals = await this.getAllGoals();
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      const results = goals
        .filter(goal => 
          goal.title.toLowerCase().includes(lowerSearchTerm) ||
          goal.developmentNeed.toLowerCase().includes(lowerSearchTerm) ||
          goal.developmentActivity.toLowerCase().includes(lowerSearchTerm) ||
          goal.developmentGoalDescription.toLowerCase().includes(lowerSearchTerm)
        )
        .map(goal => {
          // Calculate relevance score
          let relevanceScore = 0;
          if (goal.title.toLowerCase().includes(lowerSearchTerm)) relevanceScore += 3;
          if (goal.developmentNeed.toLowerCase().includes(lowerSearchTerm)) relevanceScore += 2;
          if (goal.developmentActivity.toLowerCase().includes(lowerSearchTerm)) relevanceScore += 1;
          if (goal.developmentGoalDescription.toLowerCase().includes(lowerSearchTerm)) relevanceScore += 1;
          
          return {
            type: 'goal',
            id: goal.id,
            title: goal.title,
            description: `Development Need: ${goal.developmentNeed}`,
            employeeId: goal.employeeId,
            relevanceScore
          };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      return results;
    } catch (error) {
      console.error('Error searching goals for global results:', error);
      return [];
    }
  }
}

export default EmployeeGoalsService;