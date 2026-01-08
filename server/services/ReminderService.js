import { query } from '../db/connection.js';

class ReminderService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM reminders WHERE user_id = $1 ORDER BY date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('ReminderService.list error:', error);
      throw new Error('Failed to list reminders');
    }
  }

  async get(userId, reminderId) {
    try {
      const sql = 'SELECT * FROM reminders WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [reminderId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Reminder not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('ReminderService.get error:', error);
      throw new Error(error.message || 'Failed to get reminder');
    }
  }

  async create(userId, reminderData) {
    try {
      const {
        title,
        date,
        completed = false
      } = reminderData;

      if (!title || !date) {
        throw new Error('Missing required fields: title, date');
      }

      const sql = `
        INSERT INTO reminders (user_id, title, date, completed)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [userId, title, date, completed];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('ReminderService.create error:', error);
      throw new Error('Failed to create reminder');
    }
  }

  async update(userId, reminderId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM reminders WHERE id = $1 AND user_id = $2',
        [reminderId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Reminder not found or access denied');
      }

      const allowedFields = ['title', 'date', 'completed'];
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

      values.push(reminderId, userId);

      const sql = `
        UPDATE reminders
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('ReminderService.update error:', error);
      throw new Error(error.message || 'Failed to update reminder');
    }
  }

  async delete(userId, reminderId) {
    try {
      const sql = 'DELETE FROM reminders WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [reminderId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Reminder not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('ReminderService.delete error:', error);
      throw new Error(error.message || 'Failed to delete reminder');
    }
  }
}

export default new ReminderService();
