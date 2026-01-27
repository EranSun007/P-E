import { query, pool } from '../db/connection.js';
import { parse } from 'fast-csv';
import { Readable } from 'stream';

/**
 * BugService - Service layer for DevOps Bug Dashboard
 *
 * Handles CSV parsing, bug data enrichment, KPI calculations, and CRUD operations.
 * Follows JiraService pattern for consistency and multi-tenancy.
 */
class BugService {
  // Required CSV columns for validation (UPLOAD-03)
  static REQUIRED_COLUMNS = ['Key', 'Summary', 'Priority', 'Status', 'Created', 'Resolved', 'Reporter', 'Assignee', 'Labels'];

  // Component extraction priority order
  static COMPONENT_PATTERNS = [
    { pattern: 'deploy', component: 'deployment' },
    { pattern: 'foss', component: 'foss-vulnerabilities' },
    { pattern: 'vulnerability', component: 'foss-vulnerabilities' },
    { pattern: 'broker', component: 'service-broker' },
    { pattern: 'cm-metering', component: 'cm-metering' },
    { pattern: 'sdm-metering', component: 'sdm-metering' }
  ];

  /**
   * Parse CSV buffer into bug objects with validation
   * @param {Buffer} fileBuffer - CSV file content
   * @returns {Promise<Array>} - Parsed bug objects
   * @throws {Error} - If required columns missing
   */
  async parseCSV(fileBuffer) {
    return new Promise((resolve, reject) => {
      const bugs = [];
      let headersValidated = false;

      const stream = parse({ headers: true, trim: true })
        .on('data', (row) => {
          // Validate headers on first row
          if (!headersValidated) {
            const missingColumns = BugService.REQUIRED_COLUMNS.filter(col => !(col in row));
            if (missingColumns.length > 0) {
              stream.destroy();
              reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
              return;
            }
            headersValidated = true;
          }

          // Map CSV row to bug object
          bugs.push({
            bug_key: row.Key,
            summary: row.Summary,
            priority: row.Priority,
            status: row.Status,
            created_date: this.parseDate(row.Created),
            resolved_date: row.Resolved ? this.parseDate(row.Resolved) : null,
            reporter: row.Reporter,
            assignee: row.Assignee || null,
            labels: row.Labels ? row.Labels.split(',').map(l => l.trim()).filter(Boolean) : [],
            raw_data: row
          });
        })
        .on('error', reject)
        .on('end', () => resolve(bugs));

      // Convert buffer to readable stream
      Readable.from(fileBuffer.toString()).pipe(stream);
    });
  }

  /**
   * Parse date string with multiple format fallbacks
   * JIRA exports vary by locale - try common formats
   */
  parseDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;

    // Try ISO format with space: "2025-01-15 10:30:45"
    let date = new Date(dateString.replace(' ', 'T'));
    if (!isNaN(date.getTime())) return date;

    // Try standard Date constructor
    date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    // Try DD/MM/YYYY HH:mm format
    const ddmmyyyy = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (ddmmyyyy) {
      const [, day, month, year, hour, minute] = ddmmyyyy;
      date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)));
      if (!isNaN(date.getTime())) return date;
    }

    console.warn(`Could not parse date: ${dateString}`);
    return null;
  }

  /**
   * Extract component from labels and summary
   * Priority order: deployment > foss > service-broker > cm-metering > sdm-metering > other
   */
  extractComponent(bug) {
    const labelsStr = (bug.labels || []).join(' ').toLowerCase();
    const summary = (bug.summary || '').toLowerCase();
    const combined = `${labelsStr} ${summary}`;

    for (const { pattern, component } of BugService.COMPONENT_PATTERNS) {
      if (combined.includes(pattern)) {
        return component;
      }
    }
    return 'other';
  }

  /**
   * Calculate resolution time in hours
   */
  calculateResolutionTime(bug) {
    if (!bug.created_date || !bug.resolved_date) return null;
    const created = new Date(bug.created_date);
    const resolved = new Date(bug.resolved_date);
    if (isNaN(created.getTime()) || isNaN(resolved.getTime())) return null;
    return (resolved - created) / (1000 * 60 * 60); // Convert ms to hours
  }

  /**
   * Enrich bugs with calculated fields
   */
  enrichBugs(bugs) {
    return bugs.map(bug => ({
      ...bug,
      component: this.extractComponent(bug),
      resolution_time_hours: this.calculateResolutionTime(bug)
    }));
  }

  // ============================================
  // Upload Operations (called from routes)
  // ============================================

  /**
   * List all uploads for a user
   */
  async listUploads(userId) {
    const sql = `
      SELECT id, week_ending, filename, bug_count, uploaded_at
      FROM bug_uploads
      WHERE user_id = $1
      ORDER BY week_ending DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Get upload by ID (with user_id check for security)
   */
  async getUpload(userId, uploadId) {
    const sql = `
      SELECT * FROM bug_uploads
      WHERE id = $1 AND user_id = $2
    `;
    const result = await query(sql, [uploadId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Check if upload exists for a week
   */
  async getUploadByWeek(userId, weekEnding) {
    const sql = `
      SELECT id, filename, bug_count, uploaded_at
      FROM bug_uploads
      WHERE user_id = $1 AND week_ending = $2
    `;
    const result = await query(sql, [userId, weekEnding]);
    return result.rows[0] || null;
  }

  /**
   * Delete upload (cascade deletes bugs and KPIs via DB constraint)
   */
  async deleteUpload(userId, uploadId) {
    const sql = `
      DELETE FROM bug_uploads
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    const result = await query(sql, [uploadId, userId]);
    return result.rowCount > 0;
  }
}

export default new BugService();
