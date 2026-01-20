import { query } from '../db/connection.js';

class TaskAttributeService {
  // List all attributes for a user, optionally filtered by type
  async list(userId, type = null) {
    try {
      let sql = 'SELECT * FROM task_attributes WHERE user_id = $1';
      const params = [userId];

      if (type) {
        sql += ' AND type = $2';
        params.push(type);
      }

      sql += ' ORDER BY "order" ASC, created_date DESC';
      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('TaskAttributeService.list error:', error);
      throw new Error('Failed to list task attributes');
    }
  }

  // List global attributes (no task_id) by type
  async listGlobal(userId, type) {
    try {
      const sql = `
        SELECT * FROM task_attributes
        WHERE user_id = $1 AND type = $2 AND task_id IS NULL
        ORDER BY "order" ASC, created_date DESC
      `;
      const result = await query(sql, [userId, type]);
      return result.rows;
    } catch (error) {
      console.error('TaskAttributeService.listGlobal error:', error);
      throw new Error('Failed to list global task attributes');
    }
  }

  async create(userId, attributeData) {
    try {
      const {
        name,
        value = null,
        task_id = null,  // Now optional for global attributes
        type = null,
        description = null,
        color = null,
        order = 0,
        default: isDefault = false
      } = attributeData;

      // Name is always required
      if (!name) {
        throw new Error('Missing required field: name');
      }

      // For global attributes (type is set), task_id should be null
      // For task-specific attributes, task_id is required
      if (!type && !task_id) {
        throw new Error('Either type (for global attributes) or task_id (for task-specific attributes) is required');
      }

      const sql = `
        INSERT INTO task_attributes (user_id, name, value, task_id, type, description, color, "order", "default")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [userId, name, value, task_id, type, description, color, order, isDefault];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('TaskAttributeService.create error:', error);
      throw new Error('Failed to create task attribute');
    }
  }

  async update(userId, attributeId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM task_attributes WHERE id = $1 AND user_id = $2',
        [attributeId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Task attribute not found or access denied');
      }

      // Extended allowed fields for global attributes
      const allowedFields = ['name', 'value', 'type', 'description', 'color', 'order', 'default'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, val] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          // Handle reserved word "order" and "default"
          const columnName = key === 'order' ? '"order"' : key === 'default' ? '"default"' : key;
          updateFields.push(`${columnName} = $${paramIndex}`);
          values.push(val);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return currentResult.rows[0];
      }

      values.push(attributeId, userId);

      const sql = `
        UPDATE task_attributes
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('TaskAttributeService.update error:', error);
      throw new Error(error.message || 'Failed to update task attribute');
    }
  }

  async delete(userId, attributeId) {
    try {
      const sql = 'DELETE FROM task_attributes WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [attributeId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Task attribute not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('TaskAttributeService.delete error:', error);
      throw new Error(error.message || 'Failed to delete task attribute');
    }
  }
}

export default new TaskAttributeService();
