import { query } from '../db/connection.js';

class TaskService {
  /**
   * List all tasks for a user with optional sorting
   * @param {string} userId - The user ID
   * @param {string} orderBy - Sort field (e.g., '-created_date' for descending)
   * @returns {Promise<Array>} Array of tasks
   */
  async list(userId, orderBy = '-created_date') {
    try {
      // Parse orderBy parameter
      const isDescending = orderBy.startsWith('-');
      const field = isDescending ? orderBy.substring(1) : orderBy;
      const direction = isDescending ? 'DESC' : 'ASC';

      // Validate field name to prevent SQL injection
      const allowedFields = ['created_date', 'updated_date', 'title', 'status', 'priority', 'due_date'];
      const sortField = allowedFields.includes(field) ? field : 'created_date';

      const sql = `
        SELECT * FROM tasks
        WHERE user_id = $1
        ORDER BY ${sortField} ${direction}
      `;

      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('TaskService.list error:', error);
      throw new Error('Failed to list tasks');
    }
  }

  /**
   * Create a new task
   * @param {string} userId - The user ID
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async create(userId, taskData) {
    try {
      const {
        title,
        description = null,
        type,
        status,
        priority,
        tags = [],
        stakeholders = [],
        due_date = null,
        assignee = null,
        estimated_hours = null,
        actual_hours = null,
        metadata = {}
      } = taskData;

      // Validation
      if (!title || !type || !status || !priority) {
        throw new Error('Missing required fields: title, type, status, priority');
      }

      const sql = `
        INSERT INTO tasks (
          user_id, title, description, type, status, priority,
          tags, stakeholders, due_date, assignee, estimated_hours,
          actual_hours, metadata, completion_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        userId,
        title,
        description,
        type,
        status,
        priority,
        tags,
        stakeholders,
        due_date || null, // Convert empty string to null
        assignee || null, // Convert empty string to null
        estimated_hours || null, // Convert empty string to null
        actual_hours || null, // Convert empty string to null
        metadata,
        status === 'done' ? new Date().toISOString() : null
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('TaskService.create error:', error);
      throw new Error('Failed to create task');
    }
  }

  /**
   * Update an existing task
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated task
   */
  async update(userId, taskId, updates) {
    try {
      // First, get the current task to check ownership and status
      const currentTaskResult = await query(
        'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, userId]
      );

      if (currentTaskResult.rows.length === 0) {
        throw new Error('Task not found or access denied');
      }

      const currentTask = currentTaskResult.rows[0];

      // Handle completion_date logic
      let completion_date = currentTask.completion_date;
      if (updates.status === 'done' && currentTask.status !== 'done') {
        completion_date = new Date().toISOString();
      } else if (updates.status && updates.status !== 'done' && currentTask.status === 'done') {
        completion_date = null;
      }

      // Build dynamic UPDATE query
      const allowedFields = [
        'title', 'description', 'type', 'status', 'priority', 'tags',
        'stakeholders', 'due_date', 'assignee', 'estimated_hours',
        'actual_hours', 'metadata'
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
        return currentTask; // No valid fields to update
      }

      // Add completion_date if it changed
      if (completion_date !== currentTask.completion_date) {
        updateFields.push(`completion_date = $${paramIndex}`);
        values.push(completion_date);
        paramIndex++;
      }

      // Add WHERE clause parameters
      values.push(taskId, userId);

      const sql = `
        UPDATE tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('TaskService.update error:', error);
      throw new Error(error.message || 'Failed to update task');
    }
  }

  /**
   * Delete a task
   * @param {string} userId - The user ID
   * @param {string} taskId - The task ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, taskId) {
    try {
      const sql = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [taskId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Task not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('TaskService.delete error:', error);
      throw new Error(error.message || 'Failed to delete task');
    }
  }
}

export default new TaskService();
