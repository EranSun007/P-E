import { query } from '../db/connection.js';

class TeamMemberService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM team_members WHERE user_id = $1 ORDER BY created_date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('TeamMemberService.list error:', error);
      throw new Error('Failed to list team members');
    }
  }

  async get(userId, memberId) {
    try {
      const sql = 'SELECT * FROM team_members WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [memberId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Team member not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('TeamMemberService.get error:', error);
      throw new Error(error.message || 'Failed to get team member');
    }
  }

  async create(userId, memberData) {
    try {
      const {
        name,
        email = null,
        role = null,
        department = null,
        skills = [],
        phone = null,
        company = null,
        notes = null,
        leave_from = null,
        leave_to = null,
        leave_title = null
      } = memberData;

      if (!name) {
        throw new Error('Missing required field: name');
      }

      const sql = `
        INSERT INTO team_members (
          user_id, name, email, role, department, skills, phone, company,
          notes, leave_from, leave_to, leave_title
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [userId, name, email, role, department, skills, phone, company, notes, leave_from, leave_to, leave_title];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('TeamMemberService.create error:', error);
      throw new Error('Failed to create team member');
    }
  }

  async update(userId, memberId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM team_members WHERE id = $1 AND user_id = $2',
        [memberId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Team member not found or access denied');
      }

      const allowedFields = [
        'name', 'email', 'role', 'department', 'skills', 'phone', 'company',
        'notes', 'leave_from', 'leave_to', 'leave_title', 'last_activity'
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

      if (updateFields.length === 0) {
        return currentResult.rows[0];
      }

      values.push(memberId, userId);

      const sql = `
        UPDATE team_members
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('TeamMemberService.update error:', error);
      throw new Error(error.message || 'Failed to update team member');
    }
  }

  async delete(userId, memberId) {
    try {
      const sql = 'DELETE FROM team_members WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [memberId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Team member not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('TeamMemberService.delete error:', error);
      throw new Error(error.message || 'Failed to delete team member');
    }
  }
}

export default new TeamMemberService();
