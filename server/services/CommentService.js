import { query } from '../db/connection.js';

class CommentService {
  async list(userId) {
    try {
      const sql = 'SELECT * FROM comments WHERE user_id = $1 ORDER BY created_date DESC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      console.error('CommentService.list error:', error);
      throw new Error('Failed to list comments');
    }
  }

  async get(userId, commentId) {
    try {
      const sql = 'SELECT * FROM comments WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [commentId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Comment not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      console.error('CommentService.get error:', error);
      throw new Error(error.message || 'Failed to get comment');
    }
  }

  async create(userId, commentData) {
    try {
      const {
        content,
        author_name = 'Local User',
        task_id = null,
        project_id = null
      } = commentData;

      if (!content) {
        throw new Error('Missing required field: content');
      }

      const sql = `
        INSERT INTO comments (user_id, content, author_name, task_id, project_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [userId, content, author_name, task_id, project_id];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('CommentService.create error:', error);
      throw new Error('Failed to create comment');
    }
  }

  async update(userId, commentId, updates) {
    try {
      const currentResult = await query(
        'SELECT * FROM comments WHERE id = $1 AND user_id = $2',
        [commentId, userId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Comment not found or access denied');
      }

      const allowedFields = ['content', 'author_name'];
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

      values.push(commentId, userId);

      const sql = `
        UPDATE comments
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('CommentService.update error:', error);
      throw new Error(error.message || 'Failed to update comment');
    }
  }

  async delete(userId, commentId) {
    try {
      const sql = 'DELETE FROM comments WHERE id = $1 AND user_id = $2';
      const result = await query(sql, [commentId, userId]);

      if (result.rowCount === 0) {
        throw new Error('Comment not found or access denied');
      }

      return true;
    } catch (error) {
      console.error('CommentService.delete error:', error);
      throw new Error(error.message || 'Failed to delete comment');
    }
  }
}

export default new CommentService();
