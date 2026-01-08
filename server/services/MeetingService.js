import { query } from '../db/connection.js';

class MeetingService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM meetings WHERE user_id = $1 ORDER BY date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('MeetingService.list error:', error);
      throw new Error('Failed to list meetings');
    }
  }

  async get(userId, meetingId) {
    try {
      const sql = 'SELECT * FROM meetings WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [meetingId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Meeting not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('MeetingService.get error:', error);
      throw new Error(error.message || 'Failed to get meeting');
    }
  }

  async create(userId, meetingData) {
    try {
      const {
        title,
        date,
        notes = null,
        status = 'scheduled',
        participants = [],
        agenda_items = [],
        action_items = []
      } = meetingData;

      if (!title || !date) {
        throw new Error('Missing required fields: title, date');
      }

      const sql = `
        INSERT INTO meetings (
          user_id, title, date, notes, status, participants, agenda_items, action_items
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [userId, title, date, notes, status, participants, agenda_items, action_items];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('MeetingService.create error:', error);
      throw new Error('Failed to create meeting');
    }
  }

  async update(userId, meetingId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
        [meetingId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Meeting not found or access denied');
      }

      const allowedFields = ['title', 'date', 'notes', 'status', 'participants', 'agenda_items', 'action_items'];
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

      values.push(meetingId, userId);

      const sql = `
        UPDATE meetings
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('MeetingService.update error:', error);
      throw new Error(error.message || 'Failed to update meeting');
    }
  }

  async delete(userId, meetingId) {
    try {
      const sql = 'DELETE FROM meetings WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [meetingId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Meeting not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('MeetingService.delete error:', error);
      throw new Error(error.message || 'Failed to delete meeting');
    }
  }
}

export default new MeetingService();
