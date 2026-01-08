import { query } from '../db/connection.js';

class CalendarEventService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('CalendarEventService.list error:', error);
      throw new Error('Failed to list calendar events');
    }
  }

  async get(userId, eventId) {
    try {
      const sql = 'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [eventId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Calendar event not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('CalendarEventService.get error:', error);
      throw new Error(error.message || 'Failed to get calendar event');
    }
  }

  async create(userId, eventData) {
    try {
      const {
        title,
        date,
        start_time = null,
        end_time = null,
        all_day = false,
        recurrence_rule = null
      } = eventData;

      if (!title || !date) {
        throw new Error('Missing required fields: title, date');
      }

      const sql = `
        INSERT INTO calendar_events (
          user_id, title, date, start_time, end_time, all_day, recurrence_rule
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [userId, title, date, start_time, end_time, all_day, recurrence_rule];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('CalendarEventService.create error:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async update(userId, eventId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Calendar event not found or access denied');
      }

      const allowedFields = ['title', 'date', 'start_time', 'end_time', 'all_day', 'recurrence_rule'];
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

      values.push(eventId, userId);

      const sql = `
        UPDATE calendar_events
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('CalendarEventService.update error:', error);
      throw new Error(error.message || 'Failed to update calendar event');
    }
  }

  async delete(userId, eventId) {
    try {
      const sql = 'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [eventId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Calendar event not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('CalendarEventService.delete error:', error);
      throw new Error(error.message || 'Failed to delete calendar event');
    }
  }
}

export default new CalendarEventService();
