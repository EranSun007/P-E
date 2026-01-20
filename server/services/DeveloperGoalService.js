import { query } from '../db/connection.js';

class DeveloperGoalService {
  /**
   * List all developer goals for a team member, optionally filtered by year
   * @param {string} userId - The user ID
   * @param {string} teamMemberId - The team member ID
   * @param {number} year - Optional year filter
   * @returns {Promise<Array>} Array of developer goals
   */
  async list(userId, teamMemberId, year = null) {
    try {
      let sql = `
        SELECT * FROM developer_goals
        WHERE user_id = $1 AND team_member_id = $2
      `;
      const params = [userId, teamMemberId];

      if (year) {
        sql += ` AND year = $3`;
        params.push(year);
      }

      sql += ` ORDER BY year DESC, created_date DESC`;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('DeveloperGoalService.list error:', error);
      throw new Error('Failed to list developer goals');
    }
  }

  /**
   * Get a single developer goal by ID
   * @param {string} userId - The user ID
   * @param {string} goalId - The goal ID
   * @returns {Promise<Object|null>} The goal or null
   */
  async get(userId, goalId) {
    try {
      const sql = `
        SELECT * FROM developer_goals
        WHERE id = $1 AND user_id = $2
      `;
      const result = await query(sql, [goalId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('DeveloperGoalService.get error:', error);
      throw new Error('Failed to get developer goal');
    }
  }

  /**
   * Create a new developer goal
   * @param {string} userId - The user ID
   * @param {Object} goalData - Goal data
   * @returns {Promise<Object>} Created goal
   */
  async create(userId, goalData) {
    try {
      const {
        team_member_id,
        year,
        title,
        description = null,
        progress = 0
      } = goalData;

      if (!team_member_id || !year || !title) {
        throw new Error('Missing required fields: team_member_id, year, title');
      }

      if (progress < 0 || progress > 100) {
        throw new Error('Progress must be between 0 and 100');
      }

      const sql = `
        INSERT INTO developer_goals (
          user_id, team_member_id, year, title, description, progress
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [userId, team_member_id, year, title, description, progress];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('DeveloperGoalService.create error:', error);
      throw new Error(error.message || 'Failed to create developer goal');
    }
  }

  /**
   * Update an existing developer goal
   * @param {string} userId - The user ID
   * @param {string} goalId - The goal ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated goal
   */
  async update(userId, goalId, updates) {
    try {
      // Verify ownership
      const existingGoal = await this.get(userId, goalId);
      if (!existingGoal) {
        throw new Error('Developer goal not found or access denied');
      }

      // Validate progress if provided
      if (updates.progress !== undefined) {
        if (updates.progress < 0 || updates.progress > 100) {
          throw new Error('Progress must be between 0 and 100');
        }
      }

      const allowedFields = ['title', 'description', 'progress', 'year'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return existingGoal;
      }

      values.push(goalId, userId);

      const sql = `
        UPDATE developer_goals
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('DeveloperGoalService.update error:', error);
      throw new Error(error.message || 'Failed to update developer goal');
    }
  }

  /**
   * Delete a developer goal
   * @param {string} userId - The user ID
   * @param {string} goalId - The goal ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, goalId) {
    try {
      const sql = 'DELETE FROM developer_goals WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [goalId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Developer goal not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('DeveloperGoalService.delete error:', error);
      throw new Error(error.message || 'Failed to delete developer goal');
    }
  }
}

export default new DeveloperGoalService();
