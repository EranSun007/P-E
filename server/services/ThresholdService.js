import { query } from '../db/connection.js';
import NotificationService from './NotificationService.js';
import EmailService from './EmailService.js';

/**
 * KPI threshold definitions for status determination
 * Source of truth: src/components/bugs/KPICard.jsx
 * Keep in sync - any changes there must be reflected here
 */
const KPI_THRESHOLDS = {
  bug_inflow_rate: {
    type: 'lower_is_better',
    green: 6,
    yellow: 8,
  },
  median_ttfr_hours: {
    type: 'lower_is_better',
    green: 24,
    yellow: 48,
  },
  sla_vh_percent: {
    type: 'higher_is_better',
    green: 80,
    yellow: 60,
  },
  sla_high_percent: {
    type: 'higher_is_better',
    green: 80,
    yellow: 60,
  },
  backlog_health_score: {
    type: 'higher_is_better',
    green: 70,
    yellow: 50,
  },
};

const KPI_LABELS = {
  bug_inflow_rate: 'Bug Inflow Rate',
  median_ttfr_hours: 'Time to First Response',
  sla_vh_percent: 'SLA Compliance (VH)',
  sla_high_percent: 'SLA Compliance (High)',
  backlog_health_score: 'Backlog Health Score',
};

/**
 * Determine KPI status based on value and thresholds
 */
function getKPIStatus(kpiKey, value) {
  const threshold = KPI_THRESHOLDS[kpiKey];
  if (!threshold || value === null || value === undefined || isNaN(value)) {
    return 'neutral';
  }

  if (threshold.type === 'lower_is_better') {
    if (value <= threshold.green) return 'green';
    if (value <= threshold.yellow) return 'yellow';
    return 'red';
  } else {
    if (value >= threshold.green) return 'green';
    if (value >= threshold.yellow) return 'yellow';
    return 'red';
  }
}

class ThresholdService {
  /**
   * Evaluate KPIs and create notifications for red zone breaches
   * Called fire-and-forget after CSV upload completes
   *
   * @param {string} userId - User ID
   * @param {object} kpis - KPI data object from upload result
   * @param {string} weekEnding - Week ending date string
   */
  async evaluateAndNotify(userId, kpis, weekEnding) {
    if (!kpis || typeof kpis !== 'object') {
      console.log('ThresholdService: No KPI data to evaluate');
      return;
    }

    const kpiKeys = Object.keys(KPI_THRESHOLDS);

    for (const kpiKey of kpiKeys) {
      const value = kpis[kpiKey];
      const status = getKPIStatus(kpiKey, value);

      if (status === 'red') {
        console.log(`ThresholdService: ${kpiKey} in red zone (${value})`);
        await this.createNotificationIfNotDuplicate(userId, kpiKey, value, weekEnding);
      }
    }
  }

  /**
   * Create notification if no duplicate exists within 24 hours
   * Deduplication prevents alert spam on re-uploads or multiple week uploads
   */
  async createNotificationIfNotDuplicate(userId, kpiKey, value, weekEnding) {
    try {
      // Check for existing notification within 24-hour window
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const existingResult = await query(`
        SELECT id FROM notifications
        WHERE user_id = $1
          AND notification_type = 'kpi_alert'
          AND metadata->>'kpi_key' = $2
          AND created_date > $3
        LIMIT 1
      `, [userId, kpiKey, cutoff.toISOString()]);

      if (existingResult.rows.length > 0) {
        console.log(`ThresholdService: Duplicate notification suppressed for ${kpiKey}`);
        return null;
      }

      // Create new notification
      const label = KPI_LABELS[kpiKey] || kpiKey;
      const threshold = KPI_THRESHOLDS[kpiKey];
      const thresholdValue = threshold.yellow;

      const message = `KPI Alert: ${label} has crossed into the red zone (${value}${kpiKey.includes('percent') ? '%' : ''})`;

      const notification = await NotificationService.createWithType(userId, {
        message,
        notification_type: 'kpi_alert',
        metadata: {
          kpi_key: kpiKey,
          value: value,
          week_ending: weekEnding,
          threshold: thresholdValue,
        },
      });

      console.log(`ThresholdService: Created notification for ${kpiKey}`);

      // Fire-and-forget email - don't await, don't block
      EmailService.sendKPIAlert(userId, kpiKey, value, weekEnding)
        .catch(err => console.error('ThresholdService: Email failed for', kpiKey, err.message));

      return notification;
    } catch (error) {
      console.error(`ThresholdService: Failed to create notification for ${kpiKey}:`, error);
      return null;
    }
  }
}

export default new ThresholdService();
