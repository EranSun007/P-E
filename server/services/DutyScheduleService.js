import { query } from '../db/connection.js';

class DutyScheduleService {
  /**
   * List all duty schedules for a user
   * Optionally filter by team and/or duty type
   */
  async list(userId, filters = {}) {
    try {
      let sql = `
        SELECT ds.*,
               tm.name as team_member_name,
               tm.department as team_member_department
        FROM duty_schedule ds
        LEFT JOIN team_members tm ON ds.team_member_id = tm.id
        WHERE ds.user_id = $1
      `;
      const values = [userId];
      let paramIndex = 2;

      if (filters.team) {
        sql += ` AND ds.team = $${paramIndex}`;
        values.push(filters.team);
        paramIndex++;
      }

      if (filters.duty_type) {
        sql += ` AND ds.duty_type = $${paramIndex}`;
        values.push(filters.duty_type);
        paramIndex++;
      }

      sql += ' ORDER BY ds.start_date ASC';

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('DutyScheduleService.list error:', error);
      throw new Error('Failed to list duty schedules');
    }
  }

  /**
   * List duties within a date range (for calendar view)
   */
  async listByDateRange(userId, startDate, endDate, filters = {}) {
    try {
      let sql = `
        SELECT ds.*,
               tm.name as team_member_name,
               tm.department as team_member_department
        FROM duty_schedule ds
        LEFT JOIN team_members tm ON ds.team_member_id = tm.id
        WHERE ds.user_id = $1
          AND ds.start_date <= $3
          AND ds.end_date >= $2
      `;
      const values = [userId, startDate, endDate];
      let paramIndex = 4;

      if (filters.team) {
        sql += ` AND ds.team = $${paramIndex}`;
        values.push(filters.team);
        paramIndex++;
      }

      if (filters.duty_type) {
        sql += ` AND ds.duty_type = $${paramIndex}`;
        values.push(filters.duty_type);
        paramIndex++;
      }

      sql += ' ORDER BY ds.start_date ASC';

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('DutyScheduleService.listByDateRange error:', error);
      throw new Error('Failed to list duty schedules by date range');
    }
  }

  /**
   * Get upcoming duties (next 3 months from today)
   */
  async getUpcoming(userId, team = null) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      const endDate = threeMonthsLater.toISOString().split('T')[0];

      let sql = `
        SELECT ds.*,
               tm.name as team_member_name,
               tm.department as team_member_department
        FROM duty_schedule ds
        LEFT JOIN team_members tm ON ds.team_member_id = tm.id
        WHERE ds.user_id = $1
          AND ds.end_date >= $2
          AND ds.start_date <= $3
      `;
      const values = [userId, today, endDate];

      if (team) {
        sql += ' AND ds.team = $4';
        values.push(team);
      }

      sql += ' ORDER BY ds.start_date ASC';

      const result = await query(sql, values);
      return result.rows;
    } catch (error) {
      console.error('DutyScheduleService.getUpcoming error:', error);
      throw new Error('Failed to get upcoming duty schedules');
    }
  }

  /**
   * Get a single duty schedule by ID
   */
  async get(userId, dutyId) {
    try {
      const sql = `
        SELECT ds.*,
               tm.name as team_member_name,
               tm.department as team_member_department
        FROM duty_schedule ds
        LEFT JOIN team_members tm ON ds.team_member_id = tm.id
        WHERE ds.id = $1 AND ds.user_id = $2
      `;
      const result = await query(sql, [dutyId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Duty schedule not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('DutyScheduleService.get error:', error);
      throw new Error(error.message || 'Failed to get duty schedule');
    }
  }

  /**
   * Create a new duty schedule
   */
  async create(userId, dutyData) {
    try {
      const {
        team_member_id,
        team,
        duty_type,
        start_date,
        end_date,
        notes = null
      } = dutyData;

      // Validation
      if (!team_member_id || !team || !duty_type || !start_date || !end_date) {
        throw new Error('Missing required fields: team_member_id, team, duty_type, start_date, end_date');
      }

      // Validate duty_type
      const validDutyTypes = ['devops', 'dev_on_duty', 'replacement'];
      if (!validDutyTypes.includes(duty_type)) {
        throw new Error(`Invalid duty_type. Must be one of: ${validDutyTypes.join(', ')}`);
      }

      // Validate dates
      if (new Date(start_date) > new Date(end_date)) {
        throw new Error('start_date must be before or equal to end_date');
      }

      const sql = `
        INSERT INTO duty_schedule (
          user_id, team_member_id, team, duty_type, start_date, end_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [userId, team_member_id, team, duty_type, start_date, end_date, notes];
      const result = await query(sql, values);

      // Fetch with team member name
      return this.get(userId, result.rows[0].id);
    } catch (error) {
      console.error('DutyScheduleService.create error:', error);
      throw new Error(error.message || 'Failed to create duty schedule');
    }
  }

  /**
   * Update an existing duty schedule
   */
  async update(userId, dutyId, updates) {
    try {
      // Check existence and ownership
      const currentResult = await query(
        'SELECT * FROM duty_schedule WHERE id = $1 AND user_id = $2',
        [dutyId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Duty schedule not found or access denied');
      }

      const allowedFields = ['team_member_id', 'team', 'duty_type', 'start_date', 'end_date', 'notes'];
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
        return this.get(userId, dutyId);
      }

      // Validate duty_type if being updated
      if (updates.duty_type) {
        const validDutyTypes = ['devops', 'dev_on_duty', 'replacement'];
        if (!validDutyTypes.includes(updates.duty_type)) {
          throw new Error(`Invalid duty_type. Must be one of: ${validDutyTypes.join(', ')}`);
        }
      }

      values.push(dutyId, userId);

      const sql = `
        UPDATE duty_schedule
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      await query(sql, values);

      // Return with team member name
      return this.get(userId, dutyId);
    } catch (error) {
      console.error('DutyScheduleService.update error:', error);
      throw new Error(error.message || 'Failed to update duty schedule');
    }
  }

  /**
   * Delete a duty schedule
   */
  async delete(userId, dutyId) {
    try {
      const sql = 'DELETE FROM duty_schedule WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [dutyId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Duty schedule not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('DutyScheduleService.delete error:', error);
      throw new Error(error.message || 'Failed to delete duty schedule');
    }
  }

  /**
   * Get team members filtered by department (for duty assignment dropdown)
   */
  async getTeamMembersByDepartment(userId, department) {
    try {
      const sql = `
        SELECT id, name, department, role
        FROM team_members
        WHERE user_id = $1 AND department = $2
        ORDER BY name ASC
      `;
      const result = await query(sql, [userId, department]);
      return result.rows;
    } catch (error) {
      console.error('DutyScheduleService.getTeamMembersByDepartment error:', error);
      throw new Error('Failed to get team members by department');
    }
  }
}

export default new DutyScheduleService();
