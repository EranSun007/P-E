import { query } from '../db/connection.js';

class ProjectService {
  async list(userId, orderBy = '-created_date') {
    try {
      const isDescending = orderBy.startsWith('-');
      const field = isDescending ? orderBy.substring(1) : orderBy;
      const direction = isDescending ? 'DESC' : 'ASC';

      const allowedFields = ['created_date', 'name', 'status', 'deadline', 'priority_level'];
      const sortField = allowedFields.includes(field) ? field : 'created_date';

      const sql = `
        SELECT * FROM projects
        WHERE user_id = $1
        ORDER BY ${sortField} ${direction}
      `;

      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('ProjectService.list error:', error);
      throw new Error('Failed to list projects');
    }
  }

  async create(userId, projectData) {
    try {
      const {
        name,
        description = null,
        status,
        start_date = null,
        deadline = null,
        budget = null,
        cost = null,
        priority_level = 'medium',
        progress_percentage = 0,
        tags = []
      } = projectData;

      if (!name || !status) {
        throw new Error('Missing required fields: name, status');
      }

      const sql = `
        INSERT INTO projects (
          user_id, name, description, status, start_date, deadline,
          budget, cost, priority_level, progress_percentage, tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        userId, name, description, status, start_date, deadline,
        budget, cost, priority_level, progress_percentage, tags
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('ProjectService.create error:', error);
      throw new Error('Failed to create project');
    }
  }

  async update(userId, projectId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }

      const allowedFields = [
        'name', 'description', 'status', 'start_date', 'deadline',
        'budget', 'cost', 'priority_level', 'progress_percentage', 'tags'
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

      values.push(projectId, userId);

      const sql = `
        UPDATE projects
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('ProjectService.update error:', error);
      throw new Error(error.message || 'Failed to update project');
    }
  }

  async delete(userId, projectId) {
    try {
      const sql = 'DELETE FROM projects WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [projectId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Project not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('ProjectService.delete error:', error);
      throw new Error(error.message || 'Failed to delete project');
    }
  }
}

export default new ProjectService();
