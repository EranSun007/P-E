import { query } from '../db/connection.js';

/**
 * Convert snake_case database fields to camelCase for frontend
 */
function toCamelCase(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    memberName: row.member_name,
    teamDepartment: row.team_department,
    weekEndingDate: row.week_ending_date,
    completedCount: row.completed_count,
    blockerCount: row.blocker_count,
    oneLine: row.one_line,
    items: row.items || [],
    lastUpdateDays: row.last_update_days,
    createdDate: row.created_date,
    updatedDate: row.updated_date
  };
}

/**
 * Convert camelCase frontend fields to snake_case for database
 */
function toSnakeCase(data) {
  const result = {};

  if (data.memberId !== undefined) result.member_id = data.memberId;
  if (data.memberName !== undefined) result.member_name = data.memberName;
  if (data.teamDepartment !== undefined) result.team_department = data.teamDepartment;
  if (data.weekEndingDate !== undefined) result.week_ending_date = data.weekEndingDate;
  if (data.completedCount !== undefined) result.completed_count = data.completedCount;
  if (data.blockerCount !== undefined) result.blocker_count = data.blockerCount;
  if (data.oneLine !== undefined) result.one_line = data.oneLine;
  if (data.items !== undefined) result.items = data.items;
  if (data.lastUpdateDays !== undefined) result.last_update_days = data.lastUpdateDays;

  return result;
}

class TeamSummaryService {
  /**
   * List team summaries for a user with optional filters
   * @param {string} userId - The user ID
   * @param {Object} options - Filter options
   * @param {string} options.teamDepartment - Filter by team department
   * @param {string} options.startDate - Filter by start date (YYYY-MM-DD)
   * @param {string} options.endDate - Filter by end date (YYYY-MM-DD)
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Array>} Array of team summaries
   */
  async list(userId, options = {}) {
    try {
      const { teamDepartment, startDate, endDate, limit } = options;

      const conditions = ['user_id = $1'];
      const values = [userId];
      let paramIndex = 2;

      if (teamDepartment) {
        conditions.push(`team_department = $${paramIndex}`);
        values.push(teamDepartment);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`week_ending_date >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`week_ending_date <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      let sql = `
        SELECT * FROM team_summaries
        WHERE ${conditions.join(' AND ')}
        ORDER BY week_ending_date DESC, member_name ASC
      `;

      if (limit) {
        sql += ` LIMIT $${paramIndex}`;
        values.push(limit);
      }

      const result = await query(sql, values);
      return result.rows.map(toCamelCase);
    } catch (error) {
      console.error('TeamSummaryService.list error:', error);
      throw new Error('Failed to list team summaries');
    }
  }

  /**
   * Create or update a team summary (UPSERT)
   * @param {string} userId - The user ID
   * @param {Object} summaryData - Summary data
   * @returns {Promise<Object>} Created/updated summary
   */
  async create(userId, summaryData) {
    try {
      const {
        memberId,
        memberName,
        teamDepartment = 'metering',
        weekEndingDate,
        completedCount = 0,
        blockerCount = 0,
        oneLine = null,
        items = [],
        lastUpdateDays = 0
      } = summaryData;

      // Validation
      if (!memberId || !memberName || !weekEndingDate) {
        throw new Error('Missing required fields: memberId, memberName, weekEndingDate');
      }

      const sql = `
        INSERT INTO team_summaries (
          user_id, member_id, member_name, team_department, week_ending_date,
          completed_count, blocker_count, one_line, items, last_update_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, member_id, week_ending_date)
        DO UPDATE SET
          member_name = EXCLUDED.member_name,
          team_department = EXCLUDED.team_department,
          completed_count = EXCLUDED.completed_count,
          blocker_count = EXCLUDED.blocker_count,
          one_line = EXCLUDED.one_line,
          items = EXCLUDED.items,
          last_update_days = EXCLUDED.last_update_days
        RETURNING *
      `;

      const values = [
        userId,
        memberId,
        memberName,
        teamDepartment,
        weekEndingDate,
        completedCount,
        blockerCount,
        oneLine,
        JSON.stringify(items),
        lastUpdateDays
      ];

      const result = await query(sql, values);
      return toCamelCase(result.rows[0]);
    } catch (error) {
      console.error('TeamSummaryService.create error:', error);
      throw new Error('Failed to create team summary');
    }
  }

  /**
   * Update an existing team summary
   * @param {string} userId - The user ID
   * @param {string} summaryId - The summary ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated summary
   */
  async update(userId, summaryId, updates) {
    try {
      // Check ownership
      const checkResult = await query(
        'SELECT * FROM team_summaries WHERE id = $1 AND user_id = $2',
        [summaryId, userId]
      );

      if (checkResult.rows.length === 0) {
        return null; // Not found or access denied
      }

      // Convert camelCase to snake_case
      const snakeCaseUpdates = toSnakeCase(updates);

      // Build dynamic UPDATE query
      const allowedFields = [
        'member_name', 'team_department', 'week_ending_date',
        'completed_count', 'blocker_count', 'one_line', 'items', 'last_update_days'
      ];

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(snakeCaseUpdates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(key === 'items' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return toCamelCase(checkResult.rows[0]); // No valid fields to update
      }

      // Add WHERE clause parameters
      values.push(summaryId, userId);

      const sql = `
        UPDATE team_summaries
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return toCamelCase(result.rows[0]);
    } catch (error) {
      console.error('TeamSummaryService.update error:', error);
      throw new Error('Failed to update team summary');
    }
  }

  /**
   * Delete a team summary
   * @param {string} userId - The user ID
   * @param {string} summaryId - The summary ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, summaryId) {
    try {
      const sql = 'DELETE FROM team_summaries WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [summaryId, userId]);

      if (result.rowCount === 0) {
        return false; // Not found or access denied
      }

      return true;
    } catch (error) {
      console.error('TeamSummaryService.delete error:', error);
      throw new Error('Failed to delete team summary');
    }
  }

  /**
   * Get a specific team summary by member and week
   * @param {string} userId - The user ID
   * @param {string} memberId - The member ID
   * @param {string} weekEndingDate - Week ending date (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Team summary or null if not found
   */
  async getByMember(userId, memberId, weekEndingDate) {
    try {
      const sql = `
        SELECT * FROM team_summaries
        WHERE user_id = $1 AND member_id = $2 AND week_ending_date = $3
      `;

      const result = await query(sql, [userId, memberId, weekEndingDate]);

      if (result.rows.length === 0) {
        return null;
      }

      return toCamelCase(result.rows[0]);
    } catch (error) {
      console.error('TeamSummaryService.getByMember error:', error);
      throw new Error('Failed to get team summary');
    }
  }
}

export default TeamSummaryService;
