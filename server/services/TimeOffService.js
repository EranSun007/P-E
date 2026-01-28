import { query } from '../db/connection.js';

class TimeOffService {
  /**
   * List all time off entries for a user with optional filters
   */
  async list(userId, filters = {}) {
    let sql = `
      SELECT
        t.*,
        tm.name as team_member_name,
        tm.department as team_member_department
      FROM time_off t
      LEFT JOIN team_members tm ON t.team_member_id = tm.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.team_member_id) {
      sql += ` AND t.team_member_id = $${paramIndex}`;
      params.push(filters.team_member_id);
      paramIndex++;
    }

    if (filters.type) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.status) {
      sql += ` AND t.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    sql += ' ORDER BY t.start_date DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get time off entries within a date range (for calendar)
   */
  async getByDateRange(userId, startDate, endDate, filters = {}) {
    let sql = `
      SELECT
        t.*,
        tm.name as team_member_name,
        tm.department as team_member_department
      FROM time_off t
      LEFT JOIN team_members tm ON t.team_member_id = tm.id
      WHERE t.user_id = $1
        AND t.start_date <= $3
        AND t.end_date >= $2
    `;
    const params = [userId, startDate, endDate];
    let paramIndex = 4;

    if (filters.team_member_id) {
      sql += ` AND t.team_member_id = $${paramIndex}`;
      params.push(filters.team_member_id);
      paramIndex++;
    }

    if (filters.type) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    sql += ' ORDER BY t.start_date ASC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get upcoming time off entries
   */
  async getUpcoming(userId, days = 30) {
    const sql = `
      SELECT
        t.*,
        tm.name as team_member_name,
        tm.department as team_member_department
      FROM time_off t
      LEFT JOIN team_members tm ON t.team_member_id = tm.id
      WHERE t.user_id = $1
        AND t.end_date >= CURRENT_DATE
        AND t.start_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND t.status != 'cancelled'
      ORDER BY t.start_date ASC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Get time off by team member
   */
  async getByTeamMember(userId, teamMemberId) {
    const sql = `
      SELECT
        t.*,
        tm.name as team_member_name,
        tm.department as team_member_department
      FROM time_off t
      LEFT JOIN team_members tm ON t.team_member_id = tm.id
      WHERE t.user_id = $1 AND t.team_member_id = $2
      ORDER BY t.start_date DESC
    `;
    const result = await query(sql, [userId, teamMemberId]);
    return result.rows;
  }

  /**
   * Get a single time off entry by ID
   */
  async get(userId, id) {
    const sql = `
      SELECT
        t.*,
        tm.name as team_member_name,
        tm.department as team_member_department
      FROM time_off t
      LEFT JOIN team_members tm ON t.team_member_id = tm.id
      WHERE t.id = $1 AND t.user_id = $2
    `;
    const result = await query(sql, [id, userId]);

    if (result.rows.length === 0) {
      throw new Error('Time off entry not found');
    }

    return result.rows[0];
  }

  /**
   * Create a new time off entry
   */
  async create(userId, data) {
    const { team_member_id, start_date, end_date, type, half_day, notes, status } = data;

    if (!team_member_id || !start_date || !end_date) {
      throw new Error('Missing required fields: team_member_id, start_date, end_date');
    }

    const sql = `
      INSERT INTO time_off (
        user_id, team_member_id, start_date, end_date, type, half_day, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await query(sql, [
      userId,
      team_member_id,
      start_date,
      end_date,
      type || 'other',
      half_day || null,
      notes || null,
      status || 'approved'
    ]);

    // Fetch with team member info
    return this.get(userId, result.rows[0].id);
  }

  /**
   * Update a time off entry
   */
  async update(userId, id, updates) {
    // First verify ownership
    await this.get(userId, id);

    const allowedFields = ['team_member_id', 'start_date', 'end_date', 'type', 'half_day', 'notes', 'status'];
    const updateFields = [];
    const values = [id, userId];
    let paramIndex = 3;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return this.get(userId, id);
    }

    const sql = `
      UPDATE time_off
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    await query(sql, values);
    return this.get(userId, id);
  }

  /**
   * Delete a time off entry
   */
  async delete(userId, id) {
    // First verify ownership
    await this.get(userId, id);

    const sql = 'DELETE FROM time_off WHERE id = $1 AND user_id = $2';
    await query(sql, [id, userId]);
    return { success: true };
  }
}

export default new TimeOffService();
