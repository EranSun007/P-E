import { query } from '../db/connection.js';
import { randomUUID } from 'crypto';

class WorkItemService {
  /**
   * List all work items for a user with optional filtering by team member
   * @param {string} userId - The user ID
   * @param {string} teamMemberId - Optional team member ID filter
   * @param {string} status - Optional status filter ('active', 'completed')
   * @returns {Promise<Array>} Array of work items
   */
  async list(userId, teamMemberId = null, status = null) {
    try {
      let sql = `
        SELECT wi.*,
               tm.name as team_member_name,
               p.name as project_name
        FROM work_items wi
        LEFT JOIN team_members tm ON wi.team_member_id = tm.id
        LEFT JOIN projects p ON wi.project_id = p.id
        WHERE wi.user_id = $1
      `;
      const values = [userId];
      let paramIndex = 2;

      if (teamMemberId) {
        sql += ` AND wi.team_member_id = $${paramIndex}`;
        values.push(teamMemberId);
        paramIndex++;
      }

      if (status) {
        sql += ` AND wi.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      sql += ` ORDER BY wi.created_date DESC`;

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('WorkItemService.list error:', error);
      throw new Error('Failed to list work items');
    }
  }

  /**
   * Get a single work item by ID
   * @param {string} userId - The user ID
   * @param {string} workItemId - The work item ID
   * @returns {Promise<Object>} Work item
   */
  async get(userId, workItemId) {
    try {
      const sql = `
        SELECT wi.*,
               tm.name as team_member_name,
               p.name as project_name
        FROM work_items wi
        LEFT JOIN team_members tm ON wi.team_member_id = tm.id
        LEFT JOIN projects p ON wi.project_id = p.id
        WHERE wi.id = $1 AND wi.user_id = $2
      `;
      const result = await query(sql, [workItemId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Work item not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('WorkItemService.get error:', error);
      throw new Error(error.message || 'Failed to get work item');
    }
  }

  /**
   * Create a new work item
   * @param {string} userId - The user ID
   * @param {Object} workItemData - Work item data
   * @returns {Promise<Object>} Created work item
   */
  async create(userId, workItemData) {
    try {
      const {
        team_member_id,
        name,
        project_id = null,
        effort_estimation = null,
        sprint_name = null,
        status = 'active',
        insights = []
      } = workItemData;

      // Validation
      if (!team_member_id || !name) {
        throw new Error('Missing required fields: team_member_id, name');
      }

      const sql = `
        INSERT INTO work_items (
          user_id, team_member_id, name, project_id,
          effort_estimation, sprint_name, status, insights
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        userId,
        team_member_id,
        name,
        project_id || null,
        effort_estimation || null,
        sprint_name || null,
        status,
        JSON.stringify(insights)
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('WorkItemService.create error:', error);
      throw new Error(error.message || 'Failed to create work item');
    }
  }

  /**
   * Update an existing work item
   * @param {string} userId - The user ID
   * @param {string} workItemId - The work item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated work item
   */
  async update(userId, workItemId, updates) {
    try {
      // First, get the current work item to check ownership and status
      const currentResult = await query(
        'SELECT * FROM work_items WHERE id = $1 AND user_id = $2',
        [workItemId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Work item not found or access denied');
      }

      const currentWorkItem = currentResult.rows[0];

      // Handle completed_date logic
      let completed_date = currentWorkItem.completed_date;
      if (updates.status === 'completed' && currentWorkItem.status !== 'completed') {
        completed_date = new Date().toISOString();
      } else if (updates.status && updates.status !== 'completed' && currentWorkItem.status === 'completed') {
        completed_date = null;
      }

      // Build dynamic UPDATE query
      const allowedFields = [
        'name', 'project_id', 'effort_estimation', 'sprint_name', 'status', 'insights'
      ];

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (key === 'insights') {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0 && completed_date === currentWorkItem.completed_date) {
        return currentWorkItem; // No valid fields to update
      }

      // Add completed_date if it changed
      if (completed_date !== currentWorkItem.completed_date) {
        updateFields.push(`completed_date = $${paramIndex}`);
        values.push(completed_date);
        paramIndex++;
      }

      // Add WHERE clause parameters
      values.push(workItemId, userId);

      const sql = `
        UPDATE work_items
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('WorkItemService.update error:', error);
      throw new Error(error.message || 'Failed to update work item');
    }
  }

  /**
   * Delete a work item
   * @param {string} userId - The user ID
   * @param {string} workItemId - The work item ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, workItemId) {
    try {
      const sql = 'DELETE FROM work_items WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [workItemId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Work item not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('WorkItemService.delete error:', error);
      throw new Error(error.message || 'Failed to delete work item');
    }
  }

  /**
   * Add an insight to a work item
   * @param {string} userId - The user ID
   * @param {string} workItemId - The work item ID
   * @param {Object} insight - Insight object { text, type }
   * @returns {Promise<Object>} Updated work item
   */
  async addInsight(userId, workItemId, insight) {
    try {
      // Get current work item
      const currentResult = await query(
        'SELECT * FROM work_items WHERE id = $1 AND user_id = $2',
        [workItemId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Work item not found or access denied');
      }

      const currentWorkItem = currentResult.rows[0];

      // Parse existing insights
      let insights = [];
      if (currentWorkItem.insights) {
        insights = typeof currentWorkItem.insights === 'string'
          ? JSON.parse(currentWorkItem.insights)
          : currentWorkItem.insights;
      }

      // Create new insight with ID and timestamp
      const newInsight = {
        id: randomUUID(),
        text: insight.text,
        type: insight.type || 'keep', // 'keep' or 'improve'
        date: new Date().toISOString()
      };

      insights.push(newInsight);

      // Update work item with new insights array
      const sql = `
        UPDATE work_items
        SET insights = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await query(sql, [JSON.stringify(insights), workItemId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('WorkItemService.addInsight error:', error);
      throw new Error(error.message || 'Failed to add insight');
    }
  }
}

export default new WorkItemService();
