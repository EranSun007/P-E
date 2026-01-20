import { query } from '../db/connection.js';

class PeerService {
  async list(userId, orderBy = 'name ASC') {
    try {
      const sql = `
        SELECT * FROM peers
        WHERE user_id = $1
        ORDER BY ${orderBy}
      `;
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('PeerService.list error:', error);
      throw new Error('Failed to list peers');
    }
  }

  async get(userId, id) {
    try {
      const sql = 'SELECT * FROM peers WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('PeerService.get error:', error);
      throw new Error('Failed to get peer');
    }
  }

  async create(userId, data) {
    try {
      const sql = `
        INSERT INTO peers (
          user_id, name, email, phone, role, department,
          organization, collaboration_context, relationship_type,
          availability, skills, notes, avatar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const values = [
        userId,
        data.name,
        data.email || null,
        data.phone || null,
        data.role || null,
        data.department || null,
        data.organization || null,
        data.collaboration_context || null,
        data.relationship_type || 'other',
        data.availability || null,
        data.skills || [],
        data.notes || null,
        data.avatar || null
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('PeerService.create error:', error);
      throw new Error('Failed to create peer');
    }
  }

  async update(userId, id, updates) {
    try {
      // Build dynamic update query
      const allowedFields = [
        'name', 'email', 'phone', 'role', 'department',
        'organization', 'collaboration_context', 'relationship_type',
        'availability', 'skills', 'notes', 'avatar', 'last_activity'
      ];

      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = $${paramIndex}`);
          values.push(updates[field]);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return this.get(userId, id);
      }

      values.push(id, userId);
      const sql = `
        UPDATE peers
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('PeerService.update error:', error);
      throw new Error('Failed to update peer');
    }
  }

  async delete(userId, id) {
    try {
      const sql = 'DELETE FROM peers WHERE id = $1 AND user_id = $2 RETURNING id';
      const result = await query(sql, [id, userId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('PeerService.delete error:', error);
      throw new Error('Failed to delete peer');
    }
  }
}

export default new PeerService();
