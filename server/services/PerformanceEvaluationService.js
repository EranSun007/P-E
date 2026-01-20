import { query } from '../db/connection.js';

class PerformanceEvaluationService {
  /**
   * Calculate overall rating from all available ratings
   * Includes both self-assessment and manager ratings
   * @param {number} selfTechnicalRating - Self-assessment technical rating (1-5)
   * @param {number} selfCollaborationRating - Self-assessment collaboration rating (1-5)
   * @param {number} technicalRating - Manager technical rating (1-5)
   * @param {number} collaborationRating - Manager collaboration rating (1-5)
   * @returns {number|null} Overall rating or null if no ratings provided
   */
  static getOverallRating(selfTechnicalRating, selfCollaborationRating, technicalRating, collaborationRating) {
    const ratings = [selfTechnicalRating, selfCollaborationRating, technicalRating, collaborationRating]
      .filter(r => r != null);
    if (ratings.length === 0) return null;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }

  /**
   * List all performance evaluations for a team member
   * Returns current and previous year evaluations
   * @param {string} userId - The user ID
   * @param {string} teamMemberId - The team member ID
   * @returns {Promise<Array>} Array of evaluations
   */
  async list(userId, teamMemberId) {
    try {
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;

      const sql = `
        SELECT * FROM performance_evaluations
        WHERE user_id = $1 AND team_member_id = $2
          AND year >= $3
        ORDER BY year DESC
      `;

      const result = await query(sql, [userId, teamMemberId, previousYear]);
      return result.rows;
    } catch (error) {
      console.error('PerformanceEvaluationService.list error:', error);
      throw new Error('Failed to list performance evaluations');
    }
  }

  /**
   * Get a specific year's evaluation for a team member
   * @param {string} userId - The user ID
   * @param {string} teamMemberId - The team member ID
   * @param {number} year - The year
   * @returns {Promise<Object|null>} The evaluation or null
   */
  async getByYear(userId, teamMemberId, year) {
    try {
      const sql = `
        SELECT * FROM performance_evaluations
        WHERE user_id = $1 AND team_member_id = $2 AND year = $3
      `;
      const result = await query(sql, [userId, teamMemberId, year]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('PerformanceEvaluationService.getByYear error:', error);
      throw new Error('Failed to get performance evaluation');
    }
  }

  /**
   * Get a single evaluation by ID
   * @param {string} userId - The user ID
   * @param {string} evalId - The evaluation ID
   * @returns {Promise<Object|null>} The evaluation or null
   */
  async get(userId, evalId) {
    try {
      const sql = `
        SELECT * FROM performance_evaluations
        WHERE id = $1 AND user_id = $2
      `;
      const result = await query(sql, [evalId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('PerformanceEvaluationService.get error:', error);
      throw new Error('Failed to get performance evaluation');
    }
  }

  /**
   * Create a new performance evaluation
   * @param {string} userId - The user ID
   * @param {Object} evalData - Evaluation data
   * @returns {Promise<Object>} Created evaluation
   */
  async create(userId, evalData) {
    try {
      const {
        team_member_id,
        year,
        summary = null,
        strengths = null,
        areas_for_improvement = null,
        main_points = [],
        self_technical_rating = null,
        self_collaboration_rating = null,
        technical_rating = null,
        collaboration_rating = null,
        highlighted_work_items = []
      } = evalData;

      if (!team_member_id || !year) {
        throw new Error('Missing required fields: team_member_id, year');
      }

      // Validate self-assessment ratings
      if (self_technical_rating !== null && (self_technical_rating < 1 || self_technical_rating > 5)) {
        throw new Error('Self technical rating must be between 1 and 5');
      }
      if (self_collaboration_rating !== null && (self_collaboration_rating < 1 || self_collaboration_rating > 5)) {
        throw new Error('Self collaboration rating must be between 1 and 5');
      }

      // Validate manager ratings
      if (technical_rating !== null && (technical_rating < 1 || technical_rating > 5)) {
        throw new Error('Technical rating must be between 1 and 5');
      }
      if (collaboration_rating !== null && (collaboration_rating < 1 || collaboration_rating > 5)) {
        throw new Error('Collaboration rating must be between 1 and 5');
      }

      // Validate highlighted work items (max 5)
      if (highlighted_work_items.length > 5) {
        throw new Error('Maximum 5 work items can be highlighted');
      }

      const sql = `
        INSERT INTO performance_evaluations (
          user_id, team_member_id, year, summary, strengths,
          areas_for_improvement, main_points, self_technical_rating,
          self_collaboration_rating, technical_rating,
          collaboration_rating, highlighted_work_items
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        userId,
        team_member_id,
        year,
        summary,
        strengths,
        areas_for_improvement,
        JSON.stringify(main_points),
        self_technical_rating,
        self_collaboration_rating,
        technical_rating,
        collaboration_rating,
        JSON.stringify(highlighted_work_items)
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('PerformanceEvaluationService.create error:', error);
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error('An evaluation already exists for this team member and year');
      }
      throw new Error(error.message || 'Failed to create performance evaluation');
    }
  }

  /**
   * Update an existing performance evaluation
   * @param {string} userId - The user ID
   * @param {string} evalId - The evaluation ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated evaluation
   */
  async update(userId, evalId, updates) {
    try {
      // Verify ownership and get current evaluation
      const existingEval = await this.get(userId, evalId);
      if (!existingEval) {
        throw new Error('Performance evaluation not found or access denied');
      }

      // Check if evaluation is editable (current year only)
      const currentYear = new Date().getFullYear();
      if (existingEval.year < currentYear) {
        throw new Error('Cannot edit evaluations from previous years');
      }

      // Validate self-assessment ratings if provided
      if (updates.self_technical_rating !== undefined && updates.self_technical_rating !== null) {
        if (updates.self_technical_rating < 1 || updates.self_technical_rating > 5) {
          throw new Error('Self technical rating must be between 1 and 5');
        }
      }
      if (updates.self_collaboration_rating !== undefined && updates.self_collaboration_rating !== null) {
        if (updates.self_collaboration_rating < 1 || updates.self_collaboration_rating > 5) {
          throw new Error('Self collaboration rating must be between 1 and 5');
        }
      }

      // Validate manager ratings if provided
      if (updates.technical_rating !== undefined && updates.technical_rating !== null) {
        if (updates.technical_rating < 1 || updates.technical_rating > 5) {
          throw new Error('Technical rating must be between 1 and 5');
        }
      }
      if (updates.collaboration_rating !== undefined && updates.collaboration_rating !== null) {
        if (updates.collaboration_rating < 1 || updates.collaboration_rating > 5) {
          throw new Error('Collaboration rating must be between 1 and 5');
        }
      }

      // Validate highlighted work items if provided
      if (updates.highlighted_work_items && updates.highlighted_work_items.length > 5) {
        throw new Error('Maximum 5 work items can be highlighted');
      }

      const allowedFields = [
        'summary', 'strengths', 'areas_for_improvement', 'main_points',
        'self_technical_rating', 'self_collaboration_rating',
        'technical_rating', 'collaboration_rating', 'highlighted_work_items'
      ];

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          // JSON fields need to be stringified
          if (key === 'main_points' || key === 'highlighted_work_items') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return existingEval;
      }

      values.push(evalId, userId);

      const sql = `
        UPDATE performance_evaluations
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('PerformanceEvaluationService.update error:', error);
      throw new Error(error.message || 'Failed to update performance evaluation');
    }
  }

  /**
   * Delete a performance evaluation
   * @param {string} userId - The user ID
   * @param {string} evalId - The evaluation ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, evalId) {
    try {
      // Verify ownership and check year
      const existingEval = await this.get(userId, evalId);
      if (!existingEval) {
        throw new Error('Performance evaluation not found or access denied');
      }

      const currentYear = new Date().getFullYear();
      if (existingEval.year < currentYear) {
        throw new Error('Cannot delete evaluations from previous years');
      }

      const sql = 'DELETE FROM performance_evaluations WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [evalId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Performance evaluation not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('PerformanceEvaluationService.delete error:', error);
      throw new Error(error.message || 'Failed to delete performance evaluation');
    }
  }
}

export default new PerformanceEvaluationService();
