import { query } from '../db/connection.js';

class SyncSettingsService {
  /**
   * Get user sync settings
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} User settings or defaults
   */
  async get(userId) {
    try {
      const sql = `
        SELECT * FROM sync_settings
        WHERE user_id = $1
      `;

      const result = await query(sql, [userId]);

      // Return defaults if no settings exist
      if (result.rows.length === 0) {
        return {
          sprint_weeks: 2,
          default_view: 'sprint',
          default_team: null,
          settings_data: {}
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error('SyncSettingsService.get error:', error);
      throw new Error('Failed to get sync settings');
    }
  }

  /**
   * Update user sync settings (upsert)
   * @param {string} userId - The user ID
   * @param {Object} settingsData - Settings data to update
   * @returns {Promise<Object>} Updated settings
   */
  async update(userId, settingsData) {
    try {
      // Extract known fields
      const { sprint_weeks, default_view, default_team, ...remainingFields } = settingsData;

      // Build UPSERT query
      const sql = `
        INSERT INTO sync_settings (
          user_id, sprint_weeks, default_view, default_team, settings_data
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id)
        DO UPDATE SET
          sprint_weeks = COALESCE(EXCLUDED.sprint_weeks, sync_settings.sprint_weeks),
          default_view = COALESCE(EXCLUDED.default_view, sync_settings.default_view),
          default_team = COALESCE(EXCLUDED.default_team, sync_settings.default_team),
          settings_data = COALESCE(EXCLUDED.settings_data, sync_settings.settings_data),
          updated_date = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const values = [
        userId,
        sprint_weeks !== undefined ? sprint_weeks : null,
        default_view !== undefined ? default_view : null,
        default_team !== undefined ? default_team : null,
        Object.keys(remainingFields).length > 0 ? JSON.stringify(remainingFields) : null
      ];

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      console.error('SyncSettingsService.update error:', error);
      throw new Error('Failed to update sync settings');
    }
  }
}

export default new SyncSettingsService();
