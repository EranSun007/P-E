import { query, getClient } from '../db/connection.js';

class SubtaskService {
  /**
   * List all subtasks for a sync item
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item (project) ID
   * @returns {Promise<Array>} Array of subtasks
   */
  async list(userId, syncItemId) {
    try {
      // First verify sync item exists and user owns it
      const verifySql = `
        SELECT id FROM projects
        WHERE id = $1 AND user_id = $2 AND is_sync_item = true
      `;
      const verifyResult = await query(verifySql, [syncItemId, userId]);

      if (verifyResult.rows.length === 0) {
        throw new Error('Sync item not found or access denied');
      }

      // Get subtasks
      const sql = `
        SELECT * FROM tasks
        WHERE project_id = $1 AND is_subtask = true AND user_id = $2
        ORDER BY display_order ASC
      `;

      const result = await query(sql, [syncItemId, userId]);
      return result.rows;
    } catch (error) {
      console.error('SubtaskService.list error:', error);
      throw new Error(error.message || 'Failed to list subtasks');
    }
  }

  /**
   * Create a new subtask
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item (project) ID
   * @param {Object} subtaskData - Subtask data
   * @returns {Promise<Object>} Created subtask
   */
  async create(userId, syncItemId, subtaskData) {
    try {
      const { title, completed = false } = subtaskData;

      // Validation
      if (!title) {
        throw new Error('Missing required field: title');
      }

      // Verify sync item exists and user owns it
      const verifySql = `
        SELECT id FROM projects
        WHERE id = $1 AND user_id = $2 AND is_sync_item = true
      `;
      const verifyResult = await query(verifySql, [syncItemId, userId]);

      if (verifyResult.rows.length === 0) {
        throw new Error('Sync item not found or access denied');
      }

      // Get max display_order for this project
      const maxOrderSql = `
        SELECT COALESCE(MAX(display_order), -1) as max_order
        FROM tasks
        WHERE project_id = $1 AND is_subtask = true AND user_id = $2
      `;
      const maxOrderResult = await query(maxOrderSql, [syncItemId, userId]);
      const display_order = maxOrderResult.rows[0].max_order + 1;

      // Create subtask
      const status = completed ? 'done' : 'todo';
      const sql = `
        INSERT INTO tasks (
          user_id, project_id, is_subtask, title, completed,
          display_order, type, status, priority
        )
        VALUES ($1, $2, true, $3, $4, $5, 'subtask', $6, 'medium')
        RETURNING *
      `;

      const values = [userId, syncItemId, title, completed, display_order, status];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('SubtaskService.create error:', error);
      throw new Error(error.message || 'Failed to create subtask');
    }
  }

  /**
   * Update a subtask
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item (project) ID
   * @param {string} subtaskId - The subtask ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated subtask
   */
  async update(userId, syncItemId, subtaskId, updates) {
    try {
      // Verify ownership
      const verifySql = `
        SELECT * FROM tasks
        WHERE id = $1 AND user_id = $2 AND project_id = $3 AND is_subtask = true
      `;
      const verifyResult = await query(verifySql, [subtaskId, userId, syncItemId]);

      if (verifyResult.rows.length === 0) {
        throw new Error('Subtask not found or access denied');
      }

      const currentSubtask = verifyResult.rows[0];

      // Build dynamic UPDATE query
      const allowedFields = ['title', 'completed'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;

          // If completed changes, also update status
          if (key === 'completed') {
            updateFields.push(`status = $${paramIndex}`);
            values.push(value ? 'done' : 'todo');
            paramIndex++;
          }
        }
      }

      if (updateFields.length === 0) {
        return currentSubtask; // No valid fields to update
      }

      // Add WHERE clause parameters
      values.push(subtaskId, userId, syncItemId);

      const sql = `
        UPDATE tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND project_id = $${paramIndex + 2} AND is_subtask = true
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('SubtaskService.update error:', error);
      throw new Error(error.message || 'Failed to update subtask');
    }
  }

  /**
   * Delete a subtask
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item (project) ID
   * @param {string} subtaskId - The subtask ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, syncItemId, subtaskId) {
    try {
      const sql = `
        DELETE FROM tasks
        WHERE id = $1 AND user_id = $2 AND project_id = $3 AND is_subtask = true
      `;

      const result = await query(sql, [subtaskId, userId, syncItemId]);

      if (result.rowCount === 0) {
        throw new Error('Subtask not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('SubtaskService.delete error:', error);
      throw new Error(error.message || 'Failed to delete subtask');
    }
  }

  /**
   * Reorder subtasks atomically
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item (project) ID
   * @param {Array<string>} orderedSubtaskIds - Array of subtask IDs in desired order
   * @returns {Promise<Array>} Updated subtask list
   */
  async reorder(userId, syncItemId, orderedSubtaskIds) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Verify sync item exists and user owns it
      const verifySyncSql = `
        SELECT id FROM projects
        WHERE id = $1 AND user_id = $2 AND is_sync_item = true
      `;
      const verifySyncResult = await client.query(verifySyncSql, [syncItemId, userId]);

      if (verifySyncResult.rows.length === 0) {
        throw new Error('Sync item not found or access denied');
      }

      // Verify all subtask IDs belong to user and sync item
      const verifySubtasksSql = `
        SELECT id FROM tasks
        WHERE id = ANY($1) AND user_id = $2 AND project_id = $3 AND is_subtask = true
      `;
      const verifySubtasksResult = await client.query(verifySubtasksSql, [
        orderedSubtaskIds,
        userId,
        syncItemId
      ]);

      if (verifySubtasksResult.rows.length !== orderedSubtaskIds.length) {
        throw new Error('One or more subtasks not found or access denied');
      }

      // Update display_order for each subtask
      for (let i = 0; i < orderedSubtaskIds.length; i++) {
        const updateSql = `
          UPDATE tasks
          SET display_order = $1
          WHERE id = $2 AND user_id = $3 AND project_id = $4 AND is_subtask = true
        `;
        await client.query(updateSql, [i, orderedSubtaskIds[i], userId, syncItemId]);
      }

      await client.query('COMMIT');

      // Return updated subtask list
      const listSql = `
        SELECT * FROM tasks
        WHERE project_id = $1 AND is_subtask = true AND user_id = $2
        ORDER BY display_order ASC
      `;
      const result = await client.query(listSql, [syncItemId, userId]);
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('SubtaskService.reorder error:', error);
      throw new Error(error.message || 'Failed to reorder subtasks');
    } finally {
      client.release();
    }
  }
}

export default new SubtaskService();
