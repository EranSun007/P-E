import { query } from '../db/connection.js';

class NotificationService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('NotificationService.list error:', error);
      throw new Error('Failed to list notifications');
    }
  }

  async get(userId, notificationId) {
    try {
      const sql = 'SELECT * FROM notifications WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [notificationId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('NotificationService.get error:', error);
      throw new Error(error.message || 'Failed to get notification');
    }
  }

  async create(userId, notificationData) {
    try {
      const {
        message,
        read = false,
        scheduled_date = null
      } = notificationData;

      if (!message) {
        throw new Error('Missing required field: message');
      }

      const sql = `
        INSERT INTO notifications (user_id, message, read, scheduled_date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [userId, message, read, scheduled_date];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('NotificationService.create error:', error);
      throw new Error('Failed to create notification');
    }
  }

  async update(userId, notificationId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }

      const allowedFields = ['message', 'read', 'scheduled_date'];
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

      values.push(notificationId, userId);

      const sql = `
        UPDATE notifications
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('NotificationService.update error:', error);
      throw new Error(error.message || 'Failed to update notification');
    }
  }

  async delete(userId, notificationId) {
    try {
      const sql = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [notificationId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Notification not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('NotificationService.delete error:', error);
      throw new Error(error.message || 'Failed to delete notification');
    }
  }
}

export default new NotificationService();
