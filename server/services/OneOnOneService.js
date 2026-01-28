import { query } from '../db/connection.js';

class OneOnOneService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM one_on_ones WHERE user_id = $1 ORDER BY date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('OneOnOneService.list error:', error);
      throw new Error('Failed to list one-on-ones');
    }
  }

  async create(userId, oneOnOneData) {
    try {
      const {
        team_member_id,
        date,
        notes = [],
        status = 'scheduled',
        location = null,
        mood = null,
        topics_discussed = [],
        next_meeting_date = null,
        action_items = []
      } = oneOnOneData;

      if (!date) {
        throw new Error('Missing required field: date');
      }

      // Ensure notes is properly formatted as JSON
      const notesJson = Array.isArray(notes) ? JSON.stringify(notes) : JSON.stringify([]);
      const actionItemsJson = Array.isArray(action_items) ? JSON.stringify(action_items) : JSON.stringify([]);
      const topicsArray = Array.isArray(topics_discussed) ? topics_discussed : [];

      const sql = `
        INSERT INTO one_on_ones (
          user_id, team_member_id, date, notes, status, location,
          mood, topics_discussed, next_meeting_date, action_items
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      // Convert empty strings to null for date fields (PostgreSQL can't parse "" as date)
      const nextMeetingDateValue = next_meeting_date && next_meeting_date !== '' ? next_meeting_date : null;

      const values = [
        userId, team_member_id, date, notesJson, status, location,
        mood, topicsArray, nextMeetingDateValue, actionItemsJson
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('OneOnOneService.create error:', error.message, error.stack);
      throw new Error(`Failed to create one-on-one: ${error.message}`);
    }
  }

  async update(userId, oneOnOneId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM one_on_ones WHERE id = $1 AND user_id = $2',
        [oneOnOneId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('One-on-one not found or access denied');
      }

      const allowedFields = [
        'team_member_id', 'date', 'notes', 'status', 'location',
        'mood', 'topics_discussed', 'next_meeting_date', 'action_items'
      ];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          // Handle JSON fields - stringify arrays/objects for notes and action_items
          if (key === 'notes' || key === 'action_items') {
            values.push(Array.isArray(value) ? JSON.stringify(value) : JSON.stringify([]));
          } else if (key === 'topics_discussed') {
            values.push(Array.isArray(value) ? value : []);
          } else if (key === 'next_meeting_date' || key === 'date') {
            // Convert empty strings to null for date fields (PostgreSQL can't parse "" as date)
            values.push(value && value !== '' ? value : null);
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return currentResult.rows[0];
      }

      values.push(oneOnOneId, userId);

      const sql = `
        UPDATE one_on_ones
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('OneOnOneService.update error:', error);
      throw new Error(error.message || 'Failed to update one-on-one');
    }
  }

  async delete(userId, oneOnOneId) {
    try {
      const sql = 'DELETE FROM one_on_ones WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [oneOnOneId, userId]);

      if (result.rowCount === 0) {
        throw new Error('One-on-one not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('OneOnOneService.delete error:', error);
      throw new Error(error.message || 'Failed to delete one-on-one');
    }
  }
}

export default new OneOnOneService();
