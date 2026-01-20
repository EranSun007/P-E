import { query } from '../db/connection.js';

class DevOpsDutyService {
  /**
   * List all DevOps duties for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of DevOps duties
   */
  async list(userId) {
    try {
      const sql = `
        SELECT dd.*,
               tm.name as team_member_name
        FROM devops_duties dd
        LEFT JOIN team_members tm ON dd.team_member_id = tm.id
        WHERE dd.user_id = $1
        ORDER BY dd.start_date DESC
      `;
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('DevOpsDutyService.list error:', error);
      throw new Error('Failed to list DevOps duties');
    }
  }

  /**
   * List DevOps duties for a specific team member
   * @param {string} userId - The user ID
   * @param {string} teamMemberId - The team member ID
   * @returns {Promise<Array>} Array of DevOps duties
   */
  async listByTeamMember(userId, teamMemberId) {
    try {
      const sql = `
        SELECT dd.*,
               tm.name as team_member_name
        FROM devops_duties dd
        LEFT JOIN team_members tm ON dd.team_member_id = tm.id
        WHERE dd.user_id = $1 AND dd.team_member_id = $2
        ORDER BY dd.start_date DESC
      `;
      const result = await query(sql, [userId, teamMemberId]);
      return result.rows;
    } catch (error) {
      console.error('DevOpsDutyService.listByTeamMember error:', error);
      throw new Error('Failed to list DevOps duties for team member');
    }
  }

  /**
   * Get a single DevOps duty by ID
   * @param {string} userId - The user ID
   * @param {string} dutyId - The duty ID
   * @returns {Promise<Object>} DevOps duty
   */
  async get(userId, dutyId) {
    try {
      const sql = `
        SELECT dd.*,
               tm.name as team_member_name
        FROM devops_duties dd
        LEFT JOIN team_members tm ON dd.team_member_id = tm.id
        WHERE dd.id = $1 AND dd.user_id = $2
      `;
      const result = await query(sql, [dutyId, userId]);

      if (result.rows.length === 0) {
        throw new Error('DevOps duty not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('DevOpsDutyService.get error:', error);
      throw new Error(error.message || 'Failed to get DevOps duty');
    }
  }

  /**
   * Create a new DevOps duty
   * @param {string} userId - The user ID
   * @param {Object} dutyData - DevOps duty data
   * @returns {Promise<Object>} Created duty
   */
  async create(userId, dutyData) {
    try {
      const {
        team_member_id,
        start_date,
        end_date = null,
        bugs_at_start = 0,
        bugs_at_end = 0,
        bugs_solved = 0,
        escalations = 0,
        duration_days = null,
        insights = [],
        notes = null,
        status = 'active'
      } = dutyData;

      // Validation
      if (!team_member_id || !start_date) {
        throw new Error('Missing required fields: team_member_id, start_date');
      }

      // Calculate duration if end_date is provided
      let calculatedDuration = duration_days;
      if (end_date && start_date && !duration_days) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        calculatedDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }

      const sql = `
        INSERT INTO devops_duties (
          user_id, team_member_id, start_date, end_date,
          bugs_at_start, bugs_at_end, bugs_solved, escalations,
          duration_days, insights, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        userId,
        team_member_id,
        start_date,
        end_date,
        bugs_at_start,
        bugs_at_end,
        bugs_solved,
        escalations,
        calculatedDuration,
        insights,
        notes,
        status
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('DevOpsDutyService.create error:', error);
      throw new Error(error.message || 'Failed to create DevOps duty');
    }
  }

  /**
   * Update an existing DevOps duty
   * @param {string} userId - The user ID
   * @param {string} dutyId - The duty ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated duty
   */
  async update(userId, dutyId, updates) {
    try {
      // Check existence and ownership
      const currentResult = await query(
        'SELECT * FROM devops_duties WHERE id = $1 AND user_id = $2',
        [dutyId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('DevOps duty not found or access denied');
      }

      const current = currentResult.rows[0];

      // Build dynamic UPDATE query
      const allowedFields = [
        'start_date', 'end_date', 'bugs_at_start', 'bugs_at_end',
        'bugs_solved', 'escalations', 'duration_days', 'insights',
        'notes', 'status'
      ];

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

      // Recalculate duration if dates changed
      const newStartDate = updates.start_date || current.start_date;
      const newEndDate = updates.end_date !== undefined ? updates.end_date : current.end_date;
      if (newEndDate && (updates.start_date || updates.end_date) && !updates.duration_days) {
        const start = new Date(newStartDate);
        const end = new Date(newEndDate);
        const calculatedDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        updateFields.push(`duration_days = $${paramIndex}`);
        values.push(calculatedDuration);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return current;
      }

      values.push(dutyId, userId);

      const sql = `
        UPDATE devops_duties
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('DevOpsDutyService.update error:', error);
      throw new Error(error.message || 'Failed to update DevOps duty');
    }
  }

  /**
   * Delete a DevOps duty
   * @param {string} userId - The user ID
   * @param {string} dutyId - The duty ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, dutyId) {
    try {
      const sql = 'DELETE FROM devops_duties WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [dutyId, userId]);

      if (result.rowCount === 0) {
        throw new Error('DevOps duty not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('DevOpsDutyService.delete error:', error);
      throw new Error(error.message || 'Failed to delete DevOps duty');
    }
  }

  /**
   * Add an insight to a DevOps duty
   * @param {string} userId - The user ID
   * @param {string} dutyId - The duty ID
   * @param {string} insight - Insight text
   * @returns {Promise<Object>} Updated duty
   */
  async addInsight(userId, dutyId, insight) {
    try {
      const currentResult = await query(
        'SELECT * FROM devops_duties WHERE id = $1 AND user_id = $2',
        [dutyId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('DevOps duty not found or access denied');
      }

      const current = currentResult.rows[0];
      const insights = current.insights || [];
      insights.push(insight);

      const sql = `
        UPDATE devops_duties
        SET insights = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await query(sql, [insights, dutyId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('DevOpsDutyService.addInsight error:', error);
      throw new Error(error.message || 'Failed to add insight');
    }
  }

  /**
   * Mark a DevOps duty as completed with end metrics
   * @param {string} userId - The user ID
   * @param {string} dutyId - The duty ID
   * @param {Object} endData - End date and final metrics
   * @returns {Promise<Object>} Updated duty
   */
  async complete(userId, dutyId, endData) {
    try {
      const currentResult = await query(
        'SELECT * FROM devops_duties WHERE id = $1 AND user_id = $2',
        [dutyId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('DevOps duty not found or access denied');
      }

      const current = currentResult.rows[0];
      const {
        end_date = new Date().toISOString().split('T')[0],
        bugs_at_end = current.bugs_at_end,
        bugs_solved = current.bugs_solved,
        escalations = current.escalations
      } = endData;

      // Calculate duration
      const start = new Date(current.start_date);
      const end = new Date(end_date);
      const duration_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const sql = `
        UPDATE devops_duties
        SET end_date = $1,
            bugs_at_end = $2,
            bugs_solved = $3,
            escalations = $4,
            duration_days = $5,
            status = 'completed'
        WHERE id = $6 AND user_id = $7
        RETURNING *
      `;

      const values = [end_date, bugs_at_end, bugs_solved, escalations, duration_days, dutyId, userId];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('DevOpsDutyService.complete error:', error);
      throw new Error(error.message || 'Failed to complete DevOps duty');
    }
  }
}

export default new DevOpsDutyService();
