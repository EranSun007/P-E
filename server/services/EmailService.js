import nodemailer from 'nodemailer';
import pRetry, { AbortError } from 'p-retry';
import { query } from '../db/connection.js';
import UserSettingsService from './UserSettingsService.js';

/**
 * KPI labels for display in emails
 * Keep in sync with ThresholdService.js
 */
const KPI_LABELS = {
  bug_inflow_rate: 'Bug Inflow Rate',
  median_ttfr_hours: 'Time to First Response',
  sla_vh_percent: 'SLA Compliance (VH)',
  sla_high_percent: 'SLA Compliance (High)',
  backlog_health_score: 'Backlog Health Score',
};

/**
 * SMTP configuration with sensible defaults
 */
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

const SMTP_FROM = process.env.SMTP_FROM || 'noreply@pe-manager.local';
const DASHBOARD_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Permanent failure codes that should not be retried
 */
const PERMANENT_FAILURE_CODES = [550, 553, 'EAUTH', 'EENVELOPE'];

class EmailService {
  constructor() {
    this.transporter = null;
    this._initTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  _initTransporter() {
    // Only initialize if SMTP credentials are configured
    if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
      console.log('EmailService: SMTP not configured - email delivery disabled');
      return;
    }

    this.transporter = nodemailer.createTransport(SMTP_CONFIG);
    console.log(`EmailService: Initialized with SMTP host ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`);
  }

  /**
   * Log email attempt to email_queue table
   */
  async logEmailAttempt(userId, email, subject, templateType, templateData, status, attempts, error = null) {
    try {
      const sql = `
        INSERT INTO email_queue (user_id, recipient_email, subject, template_type, template_data, status, attempts, last_error, sent_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const sentDate = status === 'sent' ? new Date().toISOString() : null;
      const result = await query(sql, [
        userId,
        email,
        subject,
        templateType,
        JSON.stringify(templateData),
        status,
        attempts,
        error,
        sentDate,
      ]);
      return result.rows[0]?.id;
    } catch (err) {
      console.error('EmailService: Failed to log email attempt:', err.message);
      return null;
    }
  }

  /**
   * Send email with retry logic using p-retry
   * Retries up to 3 times with exponential backoff (1s, 2s, 4s)
   */
  async sendWithRetry(mailOptions) {
    if (!this.transporter) {
      throw new Error('SMTP not configured - cannot send email');
    }

    return pRetry(
      async () => {
        try {
          const result = await this.transporter.sendMail(mailOptions);
          return result;
        } catch (error) {
          // Check for permanent failures that should not be retried
          const isPermanent = PERMANENT_FAILURE_CODES.some(code => {
            if (typeof code === 'number' && error.responseCode === code) return true;
            if (typeof code === 'string' && error.code === code) return true;
            return false;
          });

          if (isPermanent) {
            throw new AbortError(`Permanent email failure: ${error.message}`);
          }

          // Transient error - allow retry
          throw error;
        }
      },
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
        onFailedAttempt: (error) => {
          console.log(
            `EmailService: Attempt ${error.attemptNumber} failed. ` +
            `${error.retriesLeft} retries left. Error: ${error.message}`
          );
        },
      }
    );
  }

  /**
   * Build KPI alert email content
   */
  buildKPIAlertEmail(kpiKey, value, threshold, weekEnding, dashboardUrl) {
    const label = KPI_LABELS[kpiKey] || kpiKey;
    const isPercent = kpiKey.includes('percent');
    const displayValue = isPercent ? `${value}%` : value;
    const displayThreshold = isPercent ? `${threshold}%` : threshold;

    const subject = `KPI Alert: ${label} in Red Zone`;

    const text = `
KPI Alert: ${label}

Your ${label} KPI has crossed into the red zone.

Current Value: ${displayValue}
Threshold: ${displayThreshold}
Week Ending: ${weekEnding}

View your dashboard for more details:
${dashboardUrl}/bugs

---
This is an automated notification from P&E Manager.
To update your email preferences, visit Settings > Email Notifications.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KPI Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #dc2626; padding: 20px 30px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                KPI Alert
              </h1>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Your <strong>${label}</strong> KPI has crossed into the <span style="color: #dc2626; font-weight: 600;">red zone</span>.
              </p>

              <!-- KPI Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="color: #6b7280; font-size: 14px;">Current Value</span><br>
                          <span style="color: #dc2626; font-size: 28px; font-weight: 700;">${displayValue}</span>
                        </td>
                        <td style="padding-bottom: 12px; text-align: right;">
                          <span style="color: #6b7280; font-size: 14px;">Threshold</span><br>
                          <span style="color: #374151; font-size: 28px; font-weight: 700;">${displayThreshold}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top: 1px solid #fecaca; padding-top: 12px;">
                          <span style="color: #6b7280; font-size: 14px;">Week Ending: ${weekEnding}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}/bugs" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                This is an automated notification from P&amp;E Manager.<br>
                <a href="${dashboardUrl}/settings" style="color: #2563eb; text-decoration: none;">Update email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  /**
   * Send KPI alert email to user
   * Checks user preferences before sending
   */
  async sendKPIAlert(userId, kpiKey, value, weekEnding) {
    const templateType = 'kpi_alert';
    const templateData = { kpiKey, value, weekEnding };

    try {
      // Check if email delivery is possible
      if (!this.transporter) {
        console.log('EmailService: Skipping email - SMTP not configured');
        return null;
      }

      // Get user email preference
      const prefKey = `email_pref_${kpiKey}`;
      const prefValue = await UserSettingsService.get(userId, prefKey);

      // Parse preference (stored as JSON string)
      let preference = { enabled: false, email: null };
      if (prefValue) {
        try {
          preference = JSON.parse(prefValue);
        } catch {
          console.log(`EmailService: Invalid preference format for ${prefKey}`);
        }
      }

      // Check if email is enabled for this KPI
      if (!preference.enabled) {
        console.log(`EmailService: Email disabled for ${kpiKey} by user ${userId}`);
        return null;
      }

      // Check if email address is configured
      if (!preference.email) {
        console.log(`EmailService: No email configured for ${kpiKey} by user ${userId}`);
        return null;
      }

      // Get threshold for display
      const threshold = this._getThresholdForKPI(kpiKey);

      // Build email content
      const { subject, text, html } = this.buildKPIAlertEmail(
        kpiKey,
        value,
        threshold,
        weekEnding,
        DASHBOARD_URL
      );

      // Send with retry
      const mailOptions = {
        from: SMTP_FROM,
        to: preference.email,
        subject,
        text,
        html,
      };

      await this.sendWithRetry(mailOptions);

      // Log success
      await this.logEmailAttempt(
        userId,
        preference.email,
        subject,
        templateType,
        templateData,
        'sent',
        1
      );

      console.log(`EmailService: Sent KPI alert for ${kpiKey} to ${preference.email}`);
      return { success: true, email: preference.email };
    } catch (error) {
      // Log failure
      await this.logEmailAttempt(
        userId,
        'unknown',
        `KPI Alert: ${KPI_LABELS[kpiKey] || kpiKey}`,
        templateType,
        templateData,
        'failed',
        4, // 1 initial + 3 retries
        error.message
      );

      console.error(`EmailService: Failed to send KPI alert for ${kpiKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Get yellow threshold value for a KPI (used as email threshold display)
   */
  _getThresholdForKPI(kpiKey) {
    const thresholds = {
      bug_inflow_rate: 8,
      median_ttfr_hours: 48,
      sla_vh_percent: 60,
      sla_high_percent: 60,
      backlog_health_score: 50,
    };
    return thresholds[kpiKey] || 0;
  }
}

export default new EmailService();
