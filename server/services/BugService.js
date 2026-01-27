import { query, getClient } from '../db/connection.js';
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

  // ============================================
  // KPI Calculations (KPI-01 through KPI-09)
  // ============================================

  /**
   * Calculate all 9 KPIs (KPI-01 through KPI-09) from bug array
   * @param {Array} bugs - Array of bug objects
   * @returns {Object} - KPI values object
   */
  calculateKPIs(bugs) {
    const totalBugs = bugs.length;
    const openStatuses = ['Open', 'Author Action', 'In Progress', 'Reopened'];
    const openBugs = bugs.filter(b => openStatuses.includes(b.status));
    const resolvedBugs = bugs.filter(b => b.resolution_time_hours !== null);

    // KPI 1: Bug Inflow Rate (simplified - bugs per week, actual needs 4-week rolling)
    const bugInflowRate = totalBugs / 4; // Assume 4-week dataset

    // KPI 2: Time to First Response (using resolution time as proxy - TTFR not in CSV)
    const sortedTimes = resolvedBugs
      .map(b => b.resolution_time_hours)
      .filter(t => t !== null)
      .sort((a, b) => a - b);
    const medianTTFR = this.calculateMedian(sortedTimes);
    const ttfrUnder24h = sortedTimes.length > 0
      ? (sortedTimes.filter(t => t < 24).length / sortedTimes.length) * 100
      : 0;

    // KPI 3: MTTR by Priority
    const mttrByPriority = {};
    for (const priority of ['Very High', 'High', 'Medium', 'Low']) {
      const priorityBugs = resolvedBugs.filter(b => b.priority === priority);
      const times = priorityBugs.map(b => b.resolution_time_hours).filter(t => t !== null).sort((a, b) => a - b);
      mttrByPriority[priority] = {
        median: this.calculateMedian(times),
        count: priorityBugs.length
      };
    }

    // KPI 4: SLA Compliance
    const vhBugs = resolvedBugs.filter(b => b.priority === 'Very High');
    const highBugs = resolvedBugs.filter(b => b.priority === 'High');
    const slaVhPercent = vhBugs.length > 0
      ? (vhBugs.filter(b => b.resolution_time_hours < 24).length / vhBugs.length) * 100
      : 100; // No VH bugs = 100% compliance
    const slaHighPercent = highBugs.length > 0
      ? (highBugs.filter(b => b.resolution_time_hours < 48).length / highBugs.length) * 100
      : 100;

    // KPI 5: Open Bug Age Distribution
    const now = new Date();
    const openBugAge = {};
    for (const priority of ['Very High', 'High', 'Medium', 'Low']) {
      const priorityOpen = openBugs.filter(b => b.priority === priority);
      const ages = priorityOpen.map(b => {
        if (!b.created_date) return null;
        const created = new Date(b.created_date);
        return (now - created) / (1000 * 60 * 60 * 24); // Days
      }).filter(a => a !== null);
      openBugAge[priority] = {
        count: priorityOpen.length,
        avgAgeDays: ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0
      };
    }

    // KPI 6: Automated vs Actionable Ratio
    const automatedBugs = bugs.filter(b => b.reporter && b.reporter.startsWith('T_'));
    const automatedPercent = totalBugs > 0
      ? (automatedBugs.length / totalBugs) * 100
      : 0;

    // KPI 7: Bug Category Distribution (uses component field)
    const categoryDistribution = {};
    for (const bug of bugs) {
      const cat = bug.component || 'other';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    }

    // KPI 8: Duty Rotation Workload (avg bugs per week and std dev)
    // Group by week, then calculate stats
    const weeklyGroups = {};
    for (const bug of bugs) {
      if (!bug.created_date) continue;
      const created = new Date(bug.created_date);
      const weekKey = this.getWeekKey(created);
      weeklyGroups[weekKey] = (weeklyGroups[weekKey] || 0) + 1;
    }
    const weeklyCounts = Object.values(weeklyGroups);
    const avgBugsPerWeek = weeklyCounts.length > 0
      ? weeklyCounts.reduce((a, b) => a + b, 0) / weeklyCounts.length
      : 0;
    const stdDev = this.calculateStdDev(weeklyCounts);

    // KPI 9: Backlog Health Score
    // 100 - (VH_open × 10) - (High_open × 5), clamped 0-100
    const vhOpenCount = openBugs.filter(b => b.priority === 'Very High').length;
    const highOpenCount = openBugs.filter(b => b.priority === 'High').length;
    const backlogHealthScore = Math.max(0, Math.min(100,
      100 - (vhOpenCount * 10) - (highOpenCount * 5)
    ));

    return {
      bug_inflow_rate: bugInflowRate,
      median_ttfr_hours: medianTTFR,
      ttfr_under_24h_percent: ttfrUnder24h,
      mttr_by_priority: mttrByPriority,
      sla_vh_percent: slaVhPercent,
      sla_high_percent: slaHighPercent,
      open_bug_age: openBugAge,
      automated_percent: automatedPercent,
      category_distribution: categoryDistribution,
      avg_bugs_per_week: avgBugsPerWeek,
      workload_std_dev: stdDev,
      backlog_health_score: backlogHealthScore,
      total_bugs: totalBugs,
      open_bugs_count: openBugs.length,
      resolved_bugs_count: resolvedBugs.length
    };
  }

  /**
   * Calculate median from sorted array
   */
  calculateMedian(sortedArr) {
    if (sortedArr.length === 0) return null;
    const mid = Math.floor(sortedArr.length / 2);
    return sortedArr.length % 2 === 0
      ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
      : sortedArr[mid];
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(variance);
  }

  /**
   * Get ISO week key for grouping
   */
  getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  // ============================================
  // Upload Workflow with Transaction
  // ============================================

  /**
   * Process CSV upload: parse, validate, store bugs, calculate KPIs
   * @param {string} userId - User ID for multi-tenancy
   * @param {Buffer} fileBuffer - CSV file content
   * @param {string} filename - Original filename
   * @param {string} weekEnding - Week-ending date (Saturday)
   * @returns {Object} - { uploadId, bugCount, components, kpis }
   */
  async uploadCSV(userId, fileBuffer, filename, weekEnding) {
    // 1. Parse CSV
    const bugs = await this.parseCSV(fileBuffer);

    // 2. Enrich with calculated fields
    const enrichedBugs = this.enrichBugs(bugs);

    // 3. Begin transaction
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 4. Upsert upload metadata (handles duplicate weeks)
      const uploadResult = await client.query(`
        INSERT INTO bug_uploads (user_id, week_ending, filename, bug_count)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, week_ending) DO UPDATE SET
          filename = EXCLUDED.filename,
          bug_count = EXCLUDED.bug_count,
          uploaded_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [userId, weekEnding, filename, enrichedBugs.length]);

      const uploadId = uploadResult.rows[0].id;

      // 5. Delete old bugs for this upload (allows re-upload)
      await client.query('DELETE FROM bugs WHERE upload_id = $1', [uploadId]);

      // 6. Batch insert bugs
      for (const bug of enrichedBugs) {
        await client.query(`
          INSERT INTO bugs (
            upload_id, bug_key, summary, priority, status,
            created_date, resolved_date, resolution_time_hours,
            reporter, assignee, labels, component, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          uploadId,
          bug.bug_key,
          bug.summary,
          bug.priority,
          bug.status,
          bug.created_date,
          bug.resolved_date,
          bug.resolution_time_hours,
          bug.reporter,
          bug.assignee,
          bug.labels,
          bug.component,
          JSON.stringify(bug.raw_data)
        ]);
      }

      // 7. Delete old KPIs
      await client.query('DELETE FROM weekly_kpis WHERE upload_id = $1', [uploadId]);

      // 8. Calculate and store KPIs for "all" components
      const allKPIs = this.calculateKPIs(enrichedBugs);
      await client.query(`
        INSERT INTO weekly_kpis (upload_id, component, kpi_data)
        VALUES ($1, NULL, $2)
      `, [uploadId, JSON.stringify(allKPIs)]);

      // 9. Calculate and store KPIs per component
      const components = [...new Set(enrichedBugs.map(b => b.component).filter(Boolean))];
      for (const component of components) {
        const componentBugs = enrichedBugs.filter(b => b.component === component);
        const componentKPIs = this.calculateKPIs(componentBugs);
        await client.query(`
          INSERT INTO weekly_kpis (upload_id, component, kpi_data)
          VALUES ($1, $2, $3)
        `, [uploadId, component, JSON.stringify(componentKPIs)]);
      }

      await client.query('COMMIT');

      return {
        uploadId,
        bugCount: enrichedBugs.length,
        components,
        kpis: allKPIs
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // Query Methods for API Routes
  // ============================================

  /**
   * List bugs for an upload with filtering and pagination
   */
  async listBugs(userId, uploadId, filters = {}) {
    // First verify user owns the upload
    const upload = await this.getUpload(userId, uploadId);
    if (!upload) {
      throw new Error('Upload not found');
    }

    let sql = `
      SELECT id, bug_key, summary, priority, status, created_date,
             resolved_date, resolution_time_hours, reporter, assignee,
             labels, component
      FROM bugs
      WHERE upload_id = $1
    `;
    const params = [uploadId];
    let paramIndex = 2;

    if (filters.priority) {
      sql += ` AND priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.component) {
      sql += ` AND component = $${paramIndex}`;
      params.push(filters.component);
      paramIndex++;
    }

    // Order by priority (VH first), then by age
    sql += ` ORDER BY
      CASE priority
        WHEN 'Very High' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
      END,
      created_date ASC
    `;

    // Pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get KPIs for an upload and optional component
   */
  async getKPIs(userId, uploadId, component = null) {
    // Verify user owns the upload
    const upload = await this.getUpload(userId, uploadId);
    if (!upload) {
      throw new Error('Upload not found');
    }

    const sql = `
      SELECT kpi_data, calculated_at
      FROM weekly_kpis
      WHERE upload_id = $1 AND component IS NOT DISTINCT FROM $2
    `;
    const result = await query(sql, [uploadId, component]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      ...result.rows[0].kpi_data,
      calculated_at: result.rows[0].calculated_at,
      component: component
    };
  }
}

export default new BugService();
