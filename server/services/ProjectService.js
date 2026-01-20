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

  // Helper to convert empty strings to null for numeric fields
  _toNumericOrNull(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  // Helper to convert empty strings to null for date fields
  _toDateOrNull(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    return value;
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
        tags = [],
        stakeholder_id = null
      } = projectData;

      if (!name || !status) {
        throw new Error('Missing required fields: name, status');
      }

      // Convert empty strings to null for numeric and date fields
      const safeBudget = this._toNumericOrNull(budget);
      const safeCost = this._toNumericOrNull(cost);
      const safeProgress = this._toNumericOrNull(progress_percentage) || 0;
      const safeStartDate = this._toDateOrNull(start_date);
      const safeDeadline = this._toDateOrNull(deadline);
      const safeStakeholderId = stakeholder_id || null;

      const sql = `
        INSERT INTO projects (
          user_id, name, description, status, start_date, deadline,
          budget, cost, priority_level, progress_percentage, tags, stakeholder_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        userId, name, description || null, status, safeStartDate, safeDeadline,
        safeBudget, safeCost, priority_level || 'medium', safeProgress, tags || [],
        safeStakeholderId
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
        'budget', 'cost', 'priority_level', 'progress_percentage', 'tags',
        'stakeholder_id'
      ];

      // Fields that need numeric conversion
      const numericFields = ['budget', 'cost', 'progress_percentage'];
      // Fields that need date conversion
      const dateFields = ['start_date', 'deadline'];

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          // Convert empty strings to null for numeric and date fields
          if (numericFields.includes(key)) {
            values.push(this._toNumericOrNull(value));
          } else if (dateFields.includes(key)) {
            values.push(this._toDateOrNull(value));
          } else {
            values.push(value);
          }
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
