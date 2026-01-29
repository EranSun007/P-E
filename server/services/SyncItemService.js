import { query, getClient } from '../db/connection.js';

class SyncItemService {
  /**
   * List sync items for a user with optional filtering
   * @param {string} userId - The user ID
   * @param {Object} filters - Optional filters (category, team_department, archived)
   * @returns {Promise<Array>} Array of sync items
   */
  async list(userId, filters = {}) {
    try {
      const { category, team_department, archived = false } = filters;

      const conditions = ['p.is_sync_item = true', 'p.user_id = $1', 'p.archived = $2'];
      const params = [userId, archived];
      let paramIndex = 3;

      if (category) {
        conditions.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (team_department) {
        conditions.push(`team_department = $${paramIndex}`);
        params.push(team_department);
        paramIndex++;
      }

      const sql = `
        SELECT
          p.*,
          tm.name AS assigned_to_name
        FROM projects p
        LEFT JOIN team_members tm ON p.assigned_to_id = tm.id AND tm.user_id = p.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.display_order ASC, p.created_date DESC
      `;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('SyncItemService.list error:', error);
      throw new Error('Failed to list sync items');
    }
  }

  /**
   * Get a single sync item
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item ID
   * @returns {Promise<Object>} Sync item
   */
  async get(userId, syncItemId) {
    try {
      const sql = `
        SELECT * FROM projects
        WHERE id = $1 AND user_id = $2 AND is_sync_item = true
      `;

      const result = await query(sql, [syncItemId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Sync item not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('SyncItemService.get error:', error);
      throw new Error(error.message || 'Failed to get sync item');
    }
  }

  /**
   * Create a new sync item
   * @param {string} userId - The user ID
   * @param {Object} syncItemData - Sync item data
   * @returns {Promise<Object>} Created sync item
   */
  async create(userId, syncItemData) {
    try {
      const {
        name,
        description = null,
        category = null,
        sync_status = 'not_started',
        team_department = null,
        assigned_to_id = null,
        sprint_id = null,
        week_start_date = null,
        display_order = 0
      } = syncItemData;

      // Validation
      if (!name) {
        throw new Error('Missing required field: name');
      }

      // Initialize status_history with creation entry
      const status_history = [{
        timestamp: new Date().toISOString(),
        action: 'created',
        changedBy: userId
      }];

      const sql = `
        INSERT INTO projects (
          user_id, name, description, category, sync_status,
          team_department, assigned_to_id, sprint_id, week_start_date,
          status_history, is_sync_item, archived, display_order, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, false, $11, 'active')
        RETURNING *
      `;

      const values = [
        userId,
        name,
        description,
        category,
        sync_status,
        team_department,
        assigned_to_id,
        sprint_id,
        week_start_date,
        JSON.stringify(status_history),
        display_order
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('SyncItemService.create error:', error);
      throw new Error(error.message || 'Failed to create sync item');
    }
  }

  /**
   * Update a sync item
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated sync item
   */
  async update(userId, syncItemId, updates) {
    try {
      // Get current item to verify ownership and track changes
      const currentItem = await this.get(userId, syncItemId);

      // Parse status_history (handle both string and object)
      let status_history = [];
      if (currentItem.status_history) {
        if (typeof currentItem.status_history === 'string') {
          status_history = JSON.parse(currentItem.status_history);
        } else {
          status_history = currentItem.status_history;
        }
      }

      // Track status changes
      if (updates.sync_status && updates.sync_status !== currentItem.sync_status) {
        status_history.push({
          timestamp: new Date().toISOString(),
          field: 'sync_status',
          oldValue: currentItem.sync_status,
          newValue: updates.sync_status,
          changedBy: userId
        });
      }

      // Build dynamic UPDATE query
      const allowedFields = [
        'name', 'description', 'category', 'sync_status',
        'team_department', 'assigned_to_id', 'sprint_id',
        'week_start_date', 'display_order'
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

      if (updateFields.length === 0 && status_history.length === 0) {
        return currentItem; // No valid fields to update
      }

      // Always update status_history if it changed
      updateFields.push(`status_history = $${paramIndex}`);
      values.push(JSON.stringify(status_history));
      paramIndex++;

      // Add WHERE clause parameters
      values.push(syncItemId, userId);

      const sql = `
        UPDATE projects
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND is_sync_item = true
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('SyncItemService.update error:', error);
      throw new Error(error.message || 'Failed to update sync item');
    }
  }

  /**
   * Delete a sync item (will cascade delete subtasks)
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(userId, syncItemId) {
    try {
      const sql = `
        DELETE FROM projects
        WHERE id = $1 AND user_id = $2 AND is_sync_item = true
      `;

      const result = await query(sql, [syncItemId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Sync item not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('SyncItemService.delete error:', error);
      throw new Error(error.message || 'Failed to delete sync item');
    }
  }

  /**
   * Archive a sync item
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item ID
   * @param {string} reason - Optional reason for archiving
   * @returns {Promise<Object>} Archived sync item
   */
  async archive(userId, syncItemId, reason = null) {
    try {
      // Get current item
      const currentItem = await this.get(userId, syncItemId);

      // Parse status_history
      let status_history = [];
      if (currentItem.status_history) {
        if (typeof currentItem.status_history === 'string') {
          status_history = JSON.parse(currentItem.status_history);
        } else {
          status_history = currentItem.status_history;
        }
      }

      // Add archive entry
      status_history.push({
        timestamp: new Date().toISOString(),
        action: 'archived',
        reason: reason,
        changedBy: userId
      });

      const sql = `
        UPDATE projects
        SET archived = true, status_history = $1
        WHERE id = $2 AND user_id = $3 AND is_sync_item = true
        RETURNING *
      `;

      const result = await query(sql, [JSON.stringify(status_history), syncItemId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('SyncItemService.archive error:', error);
      throw new Error(error.message || 'Failed to archive sync item');
    }
  }

  /**
   * Restore an archived sync item
   * @param {string} userId - The user ID
   * @param {string} syncItemId - The sync item ID
   * @returns {Promise<Object>} Restored sync item
   */
  async restore(userId, syncItemId) {
    try {
      // Get current item
      const currentItem = await this.get(userId, syncItemId);

      // Parse status_history
      let status_history = [];
      if (currentItem.status_history) {
        if (typeof currentItem.status_history === 'string') {
          status_history = JSON.parse(currentItem.status_history);
        } else {
          status_history = currentItem.status_history;
        }
      }

      // Add restore entry
      status_history.push({
        timestamp: new Date().toISOString(),
        action: 'restored',
        changedBy: userId
      });

      const sql = `
        UPDATE projects
        SET archived = false, status_history = $1
        WHERE id = $2 AND user_id = $3 AND is_sync_item = true
        RETURNING *
      `;

      const result = await query(sql, [JSON.stringify(status_history), syncItemId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('SyncItemService.restore error:', error);
      throw new Error(error.message || 'Failed to restore sync item');
    }
  }

  /**
   * Get archived sync items
   * @param {string} userId - The user ID
   * @param {Object} filters - Optional date filters (from_date, to_date)
   * @returns {Promise<Array>} Array of archived sync items
   */
  async getArchived(userId, filters = {}) {
    try {
      const { from_date, to_date } = filters;

      const conditions = ['is_sync_item = true', 'archived = true', 'user_id = $1'];
      const params = [userId];
      let paramIndex = 2;

      if (from_date) {
        conditions.push(`created_date >= $${paramIndex}`);
        params.push(from_date);
        paramIndex++;
      }

      if (to_date) {
        conditions.push(`created_date <= $${paramIndex}`);
        params.push(to_date);
        paramIndex++;
      }

      const sql = `
        SELECT * FROM projects
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_date DESC
      `;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('SyncItemService.getArchived error:', error);
      throw new Error('Failed to get archived sync items');
    }
  }

  /**
   * Get count of archived sync items
   * @param {string} userId - The user ID
   * @returns {Promise<number>} Count of archived items
   */
  async getArchivedCount(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM projects
        WHERE user_id = $1 AND is_sync_item = true AND archived = true
      `;

      const result = await query(sql, [userId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('SyncItemService.getArchivedCount error:', error);
      throw new Error('Failed to get archived sync items count');
    }
  }
}

export default new SyncItemService();
