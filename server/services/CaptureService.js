import { query } from '../db/connection.js';

/**
 * CaptureService - Data access layer for capture rules, inbox items, and entity mappings
 *
 * Follows the JiraService pattern for consistency.
 * All methods enforce multi-tenancy via userId parameter.
 */
class CaptureService {
  // ============================================
  // Rule Management Operations
  // ============================================

  /**
   * List all capture rules for a user
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} filters - Optional filters { enabled }
   * @returns {Array} - Array of rule objects
   */
  async listRules(userId, filters = {}) {
    let sql = `
      SELECT * FROM capture_rules
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.enabled !== undefined) {
      sql += ` AND enabled = $${paramIndex}`;
      params.push(filters.enabled);
      paramIndex++;
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get a single capture rule by ID
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} ruleId - Rule UUID
   * @returns {Object|null} - Rule object or null
   */
  async getRule(userId, ruleId) {
    const sql = `
      SELECT * FROM capture_rules
      WHERE id = $1 AND user_id = $2
    `;
    const result = await query(sql, [ruleId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new capture rule
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} ruleData - Rule data { name, description, url_pattern, selectors, enabled, metadata }
   * @returns {Object} - Created rule object
   */
  async createRule(userId, ruleData) {
    const sql = `
      INSERT INTO capture_rules (
        user_id, name, description, url_pattern, selectors, enabled, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      userId,
      ruleData.name,
      ruleData.description || null,
      ruleData.url_pattern,
      JSON.stringify(ruleData.selectors || []),
      ruleData.enabled !== undefined ? ruleData.enabled : true,
      JSON.stringify(ruleData.metadata || {})
    ]);

    return result.rows[0];
  }

  /**
   * Update an existing capture rule
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} ruleId - Rule UUID
   * @param {Object} updates - Partial rule data to update
   * @returns {Object|null} - Updated rule object or null if not found
   */
  async updateRule(userId, ruleId, updates) {
    const sql = `
      UPDATE capture_rules SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        url_pattern = COALESCE($5, url_pattern),
        selectors = COALESCE($6, selectors),
        enabled = COALESCE($7, enabled),
        metadata = COALESCE($8, metadata)
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await query(sql, [
      ruleId,
      userId,
      updates.name || null,
      updates.description !== undefined ? updates.description : null,
      updates.url_pattern || null,
      updates.selectors ? JSON.stringify(updates.selectors) : null,
      updates.enabled !== undefined ? updates.enabled : null,
      updates.metadata ? JSON.stringify(updates.metadata) : null
    ]);

    return result.rows[0] || null;
  }

  /**
   * Delete a capture rule
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} ruleId - Rule UUID
   * @returns {boolean} - True if deleted
   */
  async deleteRule(userId, ruleId) {
    const sql = 'DELETE FROM capture_rules WHERE id = $1 AND user_id = $2';
    const result = await query(sql, [ruleId, userId]);
    return result.rowCount > 0;
  }

  // ============================================
  // Inbox Management Operations
  // ============================================

  /**
   * List inbox items for a user
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} filters - Optional filters { status, rule_id }
   * @returns {Array} - Array of inbox item objects
   */
  async listInboxItems(userId, filters = {}) {
    let sql = `
      SELECT * FROM capture_inbox
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.rule_id) {
      sql += ` AND rule_id = $${paramIndex}`;
      params.push(filters.rule_id);
      paramIndex++;
    }

    sql += ' ORDER BY created_date DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get a single inbox item by ID
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} itemId - Inbox item UUID
   * @returns {Object|null} - Inbox item object or null
   */
  async getInboxItem(userId, itemId) {
    const sql = `
      SELECT * FROM capture_inbox
      WHERE id = $1 AND user_id = $2
    `;
    const result = await query(sql, [itemId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new inbox item (received from extension)
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} itemData - Item data { rule_id, rule_name, source_url, source_identifier, captured_data }
   * @returns {Object} - Created inbox item object
   */
  async createInboxItem(userId, itemData) {
    const sql = `
      INSERT INTO capture_inbox (
        user_id, rule_id, rule_name, source_url, source_identifier, captured_data
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(sql, [
      userId,
      itemData.rule_id || null,
      itemData.rule_name || null,
      itemData.source_url,
      itemData.source_identifier || null,
      JSON.stringify(itemData.captured_data)
    ]);

    return result.rows[0];
  }

  /**
   * Accept an inbox item (mark as processed)
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} itemId - Inbox item UUID
   * @param {Object} mapping - Optional mapping { target_entity_type, target_entity_id, create_mapping }
   * @returns {Object|null} - Updated inbox item or null if not found
   */
  async acceptInboxItem(userId, itemId, mapping = {}) {
    // First update the inbox item
    const updateSql = `
      UPDATE capture_inbox SET
        status = 'accepted',
        processed_at = CURRENT_TIMESTAMP,
        target_entity_type = COALESCE($3, target_entity_type),
        target_entity_id = COALESCE($4, target_entity_id)
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await query(updateSql, [
      itemId,
      userId,
      mapping.target_entity_type || null,
      mapping.target_entity_id || null
    ]);

    const item = result.rows[0];
    if (!item) {
      return null;
    }

    // Optionally create an entity mapping for future auto-apply
    if (mapping.create_mapping && item.source_identifier && mapping.target_entity_type && mapping.target_entity_id) {
      await this.createOrUpdateMapping(userId, {
        source_identifier: item.source_identifier,
        source_type: 'capture',
        source_display_name: item.source_url,
        target_entity_type: mapping.target_entity_type,
        target_entity_id: mapping.target_entity_id,
        auto_apply: true
      });
    }

    return item;
  }

  /**
   * Reject an inbox item
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} itemId - Inbox item UUID
   * @returns {Object|null} - Updated inbox item or null if not found
   */
  async rejectInboxItem(userId, itemId) {
    const sql = `
      UPDATE capture_inbox SET
        status = 'rejected',
        processed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await query(sql, [itemId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Bulk accept inbox items
   * @param {string} userId - User ID for multi-tenancy
   * @param {Array} itemIds - Array of inbox item UUIDs
   * @param {Object} mapping - Optional mapping to apply to all items
   * @returns {Array} - Array of updated items
   */
  async bulkAccept(userId, itemIds, mapping = {}) {
    const results = [];
    for (const itemId of itemIds) {
      const item = await this.acceptInboxItem(userId, itemId, mapping);
      if (item) {
        results.push(item);
      }
    }
    return results;
  }

  /**
   * Bulk reject inbox items
   * @param {string} userId - User ID for multi-tenancy
   * @param {Array} itemIds - Array of inbox item UUIDs
   * @returns {Array} - Array of updated items
   */
  async bulkReject(userId, itemIds) {
    const results = [];
    for (const itemId of itemIds) {
      const item = await this.rejectInboxItem(userId, itemId);
      if (item) {
        results.push(item);
      }
    }
    return results;
  }

  // ============================================
  // Entity Mapping Operations
  // ============================================

  /**
   * List entity mappings for a user
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} filters - Optional filters { source_type, target_entity_type }
   * @returns {Array} - Array of mapping objects
   */
  async listMappings(userId, filters = {}) {
    let sql = `
      SELECT * FROM entity_mappings
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.source_type) {
      sql += ` AND source_type = $${paramIndex}`;
      params.push(filters.source_type);
      paramIndex++;
    }

    if (filters.target_entity_type) {
      sql += ` AND target_entity_type = $${paramIndex}`;
      params.push(filters.target_entity_type);
      paramIndex++;
    }

    sql += ' ORDER BY created_date DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get a single entity mapping by ID
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} mappingId - Mapping UUID
   * @returns {Object|null} - Mapping object or null
   */
  async getMapping(userId, mappingId) {
    const sql = `
      SELECT * FROM entity_mappings
      WHERE id = $1 AND user_id = $2
    `;
    const result = await query(sql, [mappingId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Get entity mapping by source identifier (for auto-apply)
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} sourceIdentifier - Source identifier to look up
   * @returns {Object|null} - Mapping object or null
   */
  async getMappingBySource(userId, sourceIdentifier) {
    const sql = `
      SELECT * FROM entity_mappings
      WHERE user_id = $1 AND source_identifier = $2
    `;
    const result = await query(sql, [userId, sourceIdentifier]);
    return result.rows[0] || null;
  }

  /**
   * Create or update an entity mapping (upsert)
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} data - Mapping data { source_identifier, target_entity_type, target_entity_id, source_type, source_display_name, auto_apply }
   * @returns {Object} - Created/updated mapping object
   */
  async createOrUpdateMapping(userId, data) {
    const sql = `
      INSERT INTO entity_mappings (
        user_id, source_identifier, source_type, source_display_name,
        target_entity_type, target_entity_id, auto_apply
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, source_identifier)
      DO UPDATE SET
        source_type = COALESCE(EXCLUDED.source_type, entity_mappings.source_type),
        source_display_name = COALESCE(EXCLUDED.source_display_name, entity_mappings.source_display_name),
        target_entity_type = EXCLUDED.target_entity_type,
        target_entity_id = EXCLUDED.target_entity_id,
        auto_apply = COALESCE(EXCLUDED.auto_apply, entity_mappings.auto_apply),
        updated_date = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(sql, [
      userId,
      data.source_identifier,
      data.source_type || null,
      data.source_display_name || null,
      data.target_entity_type,
      data.target_entity_id,
      data.auto_apply !== undefined ? data.auto_apply : false
    ]);

    return result.rows[0];
  }

  /**
   * Delete an entity mapping
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} mappingId - Mapping UUID
   * @returns {boolean} - True if deleted
   */
  async deleteMapping(userId, mappingId) {
    const sql = 'DELETE FROM entity_mappings WHERE id = $1 AND user_id = $2';
    const result = await query(sql, [mappingId, userId]);
    return result.rowCount > 0;
  }
}

export default new CaptureService();
