import { query } from '../db/connection.js';

/**
 * JiraService - Data access layer for Jira issues and team member mappings
 *
 * Follows the GitHubService pattern for consistency.
 * All methods enforce multi-tenancy via userId parameter.
 */
class JiraService {
  // ============================================
  // Issue Sync Operations
  // ============================================

  /**
   * Sync batch of Jira issues (upsert)
   * @param {string} userId - User ID for multi-tenancy
   * @param {Array} issuesData - Array of issue objects from extension
   * @returns {Object} - { created, updated, total }
   */
  async syncIssues(userId, issuesData) {
    let created = 0;
    let updated = 0;

    for (const issue of issuesData) {
      const sql = `
        INSERT INTO jira_issues (
          user_id, issue_key, summary, status, assignee_name, assignee_id,
          story_points, priority, issue_type, sprint_name, epic_key, jira_url,
          synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, issue_key)
        DO UPDATE SET
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          assignee_name = EXCLUDED.assignee_name,
          assignee_id = EXCLUDED.assignee_id,
          story_points = EXCLUDED.story_points,
          priority = EXCLUDED.priority,
          issue_type = EXCLUDED.issue_type,
          sprint_name = EXCLUDED.sprint_name,
          epic_key = EXCLUDED.epic_key,
          jira_url = EXCLUDED.jira_url,
          synced_at = CURRENT_TIMESTAMP,
          updated_date = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS was_insert
      `;

      const result = await query(sql, [
        userId,
        issue.issue_key,
        issue.summary,
        issue.status,
        issue.assignee_name,
        issue.assignee_id,
        issue.story_points,
        issue.priority,
        issue.issue_type,
        issue.sprint_name,
        issue.epic_key,
        issue.jira_url
      ]);

      if (result.rows[0]?.was_insert) {
        created++;
      } else {
        updated++;
      }
    }

    return { created, updated, total: issuesData.length };
  }

  // ============================================
  // Issue CRUD Operations
  // ============================================

  /**
   * List all Jira issues for a user
   * @param {string} userId - User ID for multi-tenancy
   * @param {Object} filters - Optional filters (status, assignee_id, sprint_name)
   * @returns {Array} - Array of issue objects
   */
  async listIssues(userId, filters = {}) {
    let sql = `
      SELECT * FROM jira_issues
      WHERE user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (filters.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.assignee_id) {
      sql += ` AND assignee_id = $${paramIndex}`;
      params.push(filters.assignee_id);
      paramIndex++;
    }

    if (filters.sprint_name) {
      sql += ` AND sprint_name = $${paramIndex}`;
      params.push(filters.sprint_name);
      paramIndex++;
    }

    sql += ' ORDER BY synced_at DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get a single Jira issue by ID
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} issueId - Issue UUID
   * @returns {Object|null} - Issue object or null
   */
  async getIssue(userId, issueId) {
    const sql = `
      SELECT * FROM jira_issues
      WHERE id = $1 AND user_id = $2
    `;
    const result = await query(sql, [issueId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Get a Jira issue by key
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} issueKey - Jira issue key (e.g., PROJ-123)
   * @returns {Object|null} - Issue object or null
   */
  async getIssueByKey(userId, issueKey) {
    const sql = `
      SELECT * FROM jira_issues
      WHERE user_id = $1 AND issue_key = $2
    `;
    const result = await query(sql, [userId, issueKey]);
    return result.rows[0] || null;
  }

  /**
   * Delete a Jira issue
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} issueId - Issue UUID
   * @returns {boolean} - True if deleted
   */
  async deleteIssue(userId, issueId) {
    const sql = 'DELETE FROM jira_issues WHERE id = $1 AND user_id = $2';
    const result = await query(sql, [issueId, userId]);
    return result.rowCount > 0;
  }

  /**
   * Delete all Jira issues for a user (for re-sync)
   * @param {string} userId - User ID for multi-tenancy
   * @returns {number} - Count of deleted issues
   */
  async deleteAllIssues(userId) {
    const sql = 'DELETE FROM jira_issues WHERE user_id = $1';
    const result = await query(sql, [userId]);
    return result.rowCount;
  }

  // ============================================
  // Team Member Mapping Operations
  // ============================================

  /**
   * List all Jira-to-team-member mappings
   * @param {string} userId - User ID for multi-tenancy
   * @returns {Array} - Array of mapping objects with team member details
   */
  async listMappings(userId) {
    const sql = `
      SELECT
        m.*,
        tm.name as team_member_name,
        tm.email as team_member_email
      FROM jira_team_mappings m
      LEFT JOIN team_members tm ON m.team_member_id = tm.id
      WHERE m.user_id = $1
      ORDER BY m.jira_assignee_name
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Create or update a Jira-to-team-member mapping
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} jiraAssigneeId - Jira assignee ID
   * @param {string} jiraAssigneeName - Jira assignee display name
   * @param {string} teamMemberId - Team member UUID
   * @returns {Object} - Created/updated mapping
   */
  async createMapping(userId, jiraAssigneeId, jiraAssigneeName, teamMemberId) {
    const sql = `
      INSERT INTO jira_team_mappings (user_id, jira_assignee_id, jira_assignee_name, team_member_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, jira_assignee_id)
      DO UPDATE SET
        jira_assignee_name = EXCLUDED.jira_assignee_name,
        team_member_id = EXCLUDED.team_member_id,
        updated_date = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await query(sql, [userId, jiraAssigneeId, jiraAssigneeName, teamMemberId]);
    return result.rows[0];
  }

  /**
   * Delete a Jira-to-team-member mapping
   * @param {string} userId - User ID for multi-tenancy
   * @param {string} mappingId - Mapping UUID
   * @returns {boolean} - True if deleted
   */
  async deleteMapping(userId, mappingId) {
    const sql = 'DELETE FROM jira_team_mappings WHERE id = $1 AND user_id = $2';
    const result = await query(sql, [mappingId, userId]);
    return result.rowCount > 0;
  }

  // ============================================
  // Aggregation and Analytics
  // ============================================

  /**
   * Get team workload summary (issues grouped by assignee)
   * @param {string} userId - User ID for multi-tenancy
   * @returns {Array} - Array of assignee workload objects
   */
  async getTeamWorkload(userId) {
    const sql = `
      SELECT
        ji.assignee_id,
        ji.assignee_name,
        jtm.team_member_id,
        tm.name as team_member_name,
        COUNT(*) as issue_count,
        COALESCE(SUM(ji.story_points), 0) as total_points,
        COUNT(*) FILTER (WHERE ji.status NOT IN ('Done', 'Closed', 'Resolved')) as open_issues,
        COALESCE(SUM(ji.story_points) FILTER (WHERE ji.status NOT IN ('Done', 'Closed', 'Resolved')), 0) as open_points
      FROM jira_issues ji
      LEFT JOIN jira_team_mappings jtm ON ji.assignee_id = jtm.jira_assignee_id AND ji.user_id = jtm.user_id
      LEFT JOIN team_members tm ON jtm.team_member_id = tm.id
      WHERE ji.user_id = $1
      GROUP BY ji.assignee_id, ji.assignee_name, jtm.team_member_id, tm.name
      ORDER BY open_points DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Get unique filter options for UI dropdowns
   * @param {string} userId - User ID for multi-tenancy
   * @returns {Object} - { statuses, assignees, sprints }
   */
  async getFilterOptions(userId) {
    const sql = `
      SELECT
        ARRAY_AGG(DISTINCT status ORDER BY status) FILTER (WHERE status IS NOT NULL) as statuses,
        ARRAY_AGG(DISTINCT assignee_name ORDER BY assignee_name) FILTER (WHERE assignee_name IS NOT NULL) as assignees,
        ARRAY_AGG(DISTINCT sprint_name ORDER BY sprint_name) FILTER (WHERE sprint_name IS NOT NULL) as sprints
      FROM jira_issues
      WHERE user_id = $1
    `;
    const result = await query(sql, [userId]);
    const row = result.rows[0] || {};
    return {
      statuses: row.statuses || [],
      assignees: row.assignees || [],
      sprints: row.sprints || []
    };
  }

  /**
   * Get sync status (last sync time, issue count)
   * @param {string} userId - User ID for multi-tenancy
   * @returns {Object} - { lastSync, issueCount }
   */
  async getSyncStatus(userId) {
    const sql = `
      SELECT
        MAX(synced_at) as last_sync,
        COUNT(*) as issue_count
      FROM jira_issues
      WHERE user_id = $1
    `;
    const result = await query(sql, [userId]);
    return {
      lastSync: result.rows[0]?.last_sync || null,
      issueCount: parseInt(result.rows[0]?.issue_count || '0')
    };
  }

  /**
   * Get unmapped Jira assignees (assignees without team member links)
   * @param {string} userId - User ID for multi-tenancy
   * @returns {Array} - Array of { assignee_id, assignee_name, issue_count }
   */
  async getUnmappedAssignees(userId) {
    const sql = `
      SELECT
        ji.assignee_id,
        ji.assignee_name,
        COUNT(*) as issue_count
      FROM jira_issues ji
      LEFT JOIN jira_team_mappings jtm ON ji.assignee_id = jtm.jira_assignee_id AND ji.user_id = jtm.user_id
      WHERE ji.user_id = $1
        AND ji.assignee_id IS NOT NULL
        AND jtm.id IS NULL
      GROUP BY ji.assignee_id, ji.assignee_name
      ORDER BY issue_count DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }
}

export default new JiraService();
