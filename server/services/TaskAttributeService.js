import { query } from '../db/connection.js';

class TaskAttributeService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM task_attributes WHERE user_id = $1 ORDER BY created_date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('TaskAttributeService.list error:', error);
      throw new Error('Failed to list task attributes');
    }
  }

  async create(userId, attributeData) {
    try {
      const {
        name,
        value = null,
        task_id
      } = attributeData;

      if (!name || !task_id) {
        throw new Error('Missing required fields: name, task_id');
      }

      const sql = `
        INSERT INTO task_attributes (user_id, name, value, task_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [userId, name, value, task_id];
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

      const allowedFields = ['name', 'value'];
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
