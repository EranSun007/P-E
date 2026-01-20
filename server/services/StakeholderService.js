import { query } from '../db/connection.js';

class StakeholderService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM stakeholders WHERE user_id = $1 ORDER BY created_date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('StakeholderService.list error:', error);
      throw new Error('Failed to list stakeholders');
    }
  }

  async create(userId, stakeholderData) {
    try {
      const {
        name,
        email = null,
        role = null,
        phone = null,
        contact_info = null,
        company = null,
        influence_level = 'medium',
        engagement_level = 'active',
        notes = null,
        tags = [],
        department = null,
        stakeholder_group = null
      } = stakeholderData;

      if (!name) {
        throw new Error('Missing required field: name');
      }

      const sql = `
        INSERT INTO stakeholders (
          user_id, name, email, role, phone, contact_info, company,
          influence_level, engagement_level, notes, tags, department, stakeholder_group
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        userId, name, email, role, phone, contact_info, company,
        influence_level, engagement_level, notes, tags, department, stakeholder_group
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('StakeholderService.create error:', error);
      throw new Error('Failed to create stakeholder');
    }
  }

  async update(userId, stakeholderId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM stakeholders WHERE id = $1 AND user_id = $2',
        [stakeholderId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Stakeholder not found or access denied');
      }

      const allowedFields = [
        'name', 'email', 'role', 'phone', 'contact_info', 'company',
        'influence_level', 'engagement_level', 'notes', 'tags',
        'department', 'stakeholder_group'
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

      values.push(stakeholderId, userId);

      const sql = `
        UPDATE stakeholders
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('StakeholderService.update error:', error);
      throw new Error(error.message || 'Failed to update stakeholder');
    }
  }

  async delete(userId, stakeholderId) {
    try {
      const sql = 'DELETE FROM stakeholders WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [stakeholderId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Stakeholder not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('StakeholderService.delete error:', error);
      throw new Error(error.message || 'Failed to delete stakeholder');
    }
  }
}

export default new StakeholderService();
