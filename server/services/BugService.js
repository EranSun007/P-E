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
  // Map of required fields to acceptable column name variations (case-insensitive)
  static COLUMN_MAPPINGS = {
    key: ['key', 'issue key', 'issue_key', 'issuekey'],
    summary: ['summary'],
    priority: ['priority'],
    status: ['status'],
    created: ['created', 'created date', 'createddate'],
    resolved: ['resolved', 'resolved date', 'resolveddate', 'resolution date'],
    reporter: ['reporter'],
    assignee: ['assignee'],
    labels: ['labels', 'label'],
    components: ['component/s', 'components', 'component']
  };

  // Known JIRA component names (from Component/s column)
  // Expected values: Usage Data Management, Unified Metering, Metering-as-a-Service, JPaaS Metering Service, JPaaS Metering Reporting
  static KNOWN_COMPONENTS = [
    'Usage Data Management',
    'Unified Metering',
    'Metering-as-a-Service',
    'JPaaS Metering Service',
    'JPaaS Metering Reporting'
  ];

  /**
   * Find the actual column name from CSV headers that matches a required field
   * @param {Object} row - The CSV row object
   * @param {string} field - The required field name (key in COLUMN_MAPPINGS)
   * @returns {string|null} - The actual column name found, or null if not found
   */
  findColumnName(row, field) {
    const acceptableNames = BugService.COLUMN_MAPPINGS[field] || [field];
    const rowKeys = Object.keys(row);

    for (const name of acceptableNames) {
      // Try exact match first (case-insensitive)
      const found = rowKeys.find(k => k.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return null;
  }

  /**
   * Get value from row using flexible column name matching
   * @param {Object} row - The CSV row object
   * @param {string} field - The required field name
   * @param {Object} columnMap - Pre-computed column name mapping
   * @returns {string|null} - The value or null if not found
   */
  getColumnValue(row, field, columnMap) {
    const colName = columnMap[field];
    return colName ? row[colName] : null;
  }

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
      let columnMap = {}; // Maps our field names to actual CSV column names

      // Track duplicate headers and rename them (Jira exports have duplicate column names)
      const headerCounts = {};
      const renameHeaders = (headers) => {
        return headers.map(header => {
          if (headerCounts[header] === undefined) {
            headerCounts[header] = 0;
            return header;
          }
          headerCounts[header]++;
          return `${header}_${headerCounts[header]}`;
        });
      };

      const stream = parse({
        headers: renameHeaders,
        trim: true,
        ignoreEmpty: true
      })
        .on('data', (row) => {
          // Validate headers and build column map on first row
          if (!headersValidated) {
            const missingFields = [];
            for (const field of Object.keys(BugService.COLUMN_MAPPINGS)) {
              const actualColName = this.findColumnName(row, field);
              if (actualColName) {
                columnMap[field] = actualColName;
              } else if (field !== 'resolved') { // Resolved is optional
                missingFields.push(field);
              }
            }

            if (missingFields.length > 0) {
              stream.destroy();
              reject(new Error(`Missing required columns: ${missingFields.join(', ')}. Found columns: ${Object.keys(row).slice(0, 15).join(', ')}...`));
              return;
            }
            headersValidated = true;
          }

          // Combine all Labels columns (Labels, Labels_1, Labels_2, etc.)
          const allLabels = [];
          const labelsColName = columnMap.labels;
          for (const [key, value] of Object.entries(row)) {
            // Match the labels column and any numbered variants
            if (labelsColName && (key === labelsColName || key.startsWith(labelsColName + '_'))) {
              if (value) {
                allLabels.push(...value.split(',').map(l => l.trim()).filter(Boolean));
              }
            }
          }

          // Combine all Component/s columns (Component/s, Component/s_1, etc.)
          const allComponents = [];
          const componentsColName = columnMap.components;
          for (const [key, value] of Object.entries(row)) {
            // Match the components column and any numbered variants
            if (componentsColName && (key === componentsColName || key.startsWith(componentsColName + '_'))) {
              if (value) {
                allComponents.push(...value.split(',').map(c => c.trim()).filter(Boolean));
              }
            }
          }

          // Map CSV row to bug object using flexible column names
          bugs.push({
            bug_key: this.getColumnValue(row, 'key', columnMap),
            summary: this.getColumnValue(row, 'summary', columnMap),
            priority: this.getColumnValue(row, 'priority', columnMap),
            status: this.getColumnValue(row, 'status', columnMap),
            created_date: this.parseDate(this.getColumnValue(row, 'created', columnMap)),
            resolved_date: this.parseDate(this.getColumnValue(row, 'resolved', columnMap)),
            reporter: this.getColumnValue(row, 'reporter', columnMap),
            assignee: this.getColumnValue(row, 'assignee', columnMap) || null,
            labels: [...new Set(allLabels)], // Deduplicate labels
            csv_components: [...new Set(allComponents)], // Store components from CSV
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
   * Extract component from bug data using priority-based extraction
   * Priority 1: Labels array (most explicit)
   * Priority 2: Summary text (contextual)
   * Priority 3: CSV Component/s column (legacy/backup)
   * Default: 'other'
   */
  extractComponent(bug) {
    // Priority 1: Check labels array for component keywords (case-insensitive)
    if (bug.labels && bug.labels.length > 0) {
      const labelsText = bug.labels.join(' ').toLowerCase();

      // Check for specific component patterns in labels
      if (labelsText.includes('deploy') && labelsText.includes('metering')) {
        return 'deploy-metering';
      }
      if (labelsText.includes('service') && labelsText.includes('broker')) {
        return 'service-broker';
      }
      if (labelsText.includes('foss') || labelsText.includes('vulnerabilit')) {
        return 'foss-vulnerabilities';
      }
      if (labelsText.includes('cm-metering')) {
        return 'cm-metering';
      }
      if (labelsText.includes('sdm-metering')) {
        return 'sdm-metering';
      }
    }

    // Priority 2: Check summary text for component keywords (case-insensitive)
    if (bug.summary) {
      const summaryText = bug.summary.toLowerCase();

      // Same pattern matching as labels
      if (summaryText.includes('deploy') && summaryText.includes('metering')) {
        return 'deploy-metering';
      }
      if (summaryText.includes('service') && summaryText.includes('broker')) {
        return 'service-broker';
      }
      if (summaryText.includes('foss') || summaryText.includes('vulnerabilit')) {
        return 'foss-vulnerabilities';
      }
      if (summaryText.includes('cm-metering')) {
        return 'cm-metering';
      }
      if (summaryText.includes('sdm-metering')) {
        return 'sdm-metering';
      }
    }

    // Priority 3: Fall back to CSV Component/s column
    if (bug.csv_components && bug.csv_components.length > 0) {
      return bug.csv_components[0];
    }

    // Default: No match found
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

  /**
   * Get historical KPI data for trend charts
   * @param {string} userId - User ID for multi-tenancy
   * @param {number} weeks - Number of weeks to retrieve (4, 8, or 12)
   * @param {string|null} component - Optional component filter (NULL = all components)
   * @returns {Array} - Array of KPI objects with week_ending dates
   */
  async getKPIHistory(userId, weeks = 12, component = null) {
    // Validate weeks parameter - only allow 4, 8, or 12
    const validWeeks = [4, 8, 12];
    const weekCount = validWeeks.includes(weeks) ? weeks : 12;

    const sql = `
      SELECT
        wk.kpi_data,
        wk.calculated_at,
        wk.component,
        bu.week_ending
      FROM weekly_kpis wk
      JOIN bug_uploads bu ON wk.upload_id = bu.id
      WHERE bu.user_id = $1
        AND wk.component IS NOT DISTINCT FROM $2
      ORDER BY bu.week_ending DESC
      LIMIT $3
    `;

    const result = await query(sql, [userId, component, weekCount]);

    // Return array of KPI objects with week_ending dates for chart X-axis
    return result.rows.map(row => ({
      week_ending: row.week_ending,
      component: row.component,
      kpi_data: row.kpi_data,
      calculated_at: row.calculated_at
    }));
  }

  // ============================================
  // Date Range Query Methods (Sprint/Takt Filter)
  // ============================================

  /**
   * List bugs across all uploads within a date range (by created_date)
   * @param {string} userId - User ID for multi-tenancy
   * @param {Date|string} startDate - Start of date range (inclusive)
   * @param {Date|string} endDate - End of date range (inclusive)
   * @param {Object} filters - Optional filters (component, priority, status, limit, offset)
   * @returns {Array} - Bugs within the date range
   */
  async listBugsByDateRange(userId, startDate, endDate, filters = {}) {
    let sql = `
      SELECT b.id, b.bug_key, b.summary, b.priority, b.status, b.created_date,
             b.resolved_date, b.resolution_time_hours, b.reporter, b.assignee,
             b.labels, b.component, bu.week_ending
      FROM bugs b
      JOIN bug_uploads bu ON b.upload_id = bu.id
      WHERE bu.user_id = $1
        AND b.created_date >= $2
        AND b.created_date <= $3
    `;
    const params = [userId, startDate, endDate];
    let paramIndex = 4;

    if (filters.priority) {
      sql += ` AND b.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.status) {
      sql += ` AND b.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.component) {
      sql += ` AND b.component = $${paramIndex}`;
      params.push(filters.component);
      paramIndex++;
    }

    // Order by priority (VH first), then by age
    sql += ` ORDER BY
      CASE b.priority
        WHEN 'Very High' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
      END,
      b.created_date ASC
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
   * Get KPIs for bugs within a date range (calculated on the fly)
   * @param {string} userId - User ID for multi-tenancy
   * @param {Date|string} startDate - Start of date range (inclusive)
   * @param {Date|string} endDate - End of date range (inclusive)
   * @param {string|null} component - Optional component filter
   * @returns {Object} - Calculated KPIs for bugs in the date range
   */
  async getKPIsByDateRange(userId, startDate, endDate, component = null) {
    let sql = `
      SELECT b.id, b.bug_key, b.summary, b.priority, b.status, b.created_date,
             b.resolved_date, b.resolution_time_hours, b.reporter, b.assignee,
             b.labels, b.component
      FROM bugs b
      JOIN bug_uploads bu ON b.upload_id = bu.id
      WHERE bu.user_id = $1
        AND b.created_date >= $2
        AND b.created_date <= $3
    `;
    const params = [userId, startDate, endDate];

    if (component) {
      sql += ` AND b.component = $4`;
      params.push(component);
    }

    const result = await query(sql, params);
    const bugs = result.rows;

    // Calculate KPIs from the bugs
    const kpis = this.calculateKPIs(bugs);

    return {
      ...kpis,
      calculated_at: new Date().toISOString(),
      component: component,
      date_range: { startDate, endDate }
    };
  }
}

export default new BugService();
