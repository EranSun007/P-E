import express from 'express';
import UserSettingsService from '../services/UserSettingsService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Valid KPI keys that support email preferences
 */
const VALID_KPI_KEYS = [
  'bug_inflow_rate',
  'median_ttfr_hours',
  'sla_vh_percent',
  'sla_high_percent',
  'backlog_health_score',
];

/**
 * KPI labels for display
 */
const KPI_LABELS = {
  bug_inflow_rate: 'Bug Inflow Rate',
  median_ttfr_hours: 'Time to First Response',
  sla_vh_percent: 'SLA Compliance (VH)',
  sla_high_percent: 'SLA Compliance (High)',
  backlog_health_score: 'Backlog Health Score',
};

/**
 * Simple email validation regex
 */
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * GET /api/email-preferences
 * List all email preferences for current user
 */
router.get('/', async (req, res) => {
  try {
    const allSettings = await UserSettingsService.listForUser(req.user.id);

    // Filter settings that are email preferences
    const emailPrefs = allSettings
      .filter(setting => setting.key.startsWith('email_pref_'))
      .map(setting => {
        const kpiKey = setting.key.replace('email_pref_', '');
        let preference = { enabled: false, email: null };

        try {
          preference = JSON.parse(setting.value);
        } catch {
          // Invalid JSON, use defaults
        }

        return {
          kpi_key: kpiKey,
          label: KPI_LABELS[kpiKey] || kpiKey,
          enabled: preference.enabled || false,
          email: preference.email || null,
        };
      });

    res.json(emailPrefs);
  } catch (error) {
    console.error('GET /api/email-preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-preferences/:kpiKey
 * Get single preference by KPI key
 */
router.get('/:kpiKey', async (req, res) => {
  try {
    const { kpiKey } = req.params;

    if (!VALID_KPI_KEYS.includes(kpiKey)) {
      return res.status(400).json({ error: `Invalid KPI key: ${kpiKey}` });
    }

    const settingKey = `email_pref_${kpiKey}`;
    const value = await UserSettingsService.get(req.user.id, settingKey);

    let preference = { enabled: false, email: null };
    if (value) {
      try {
        preference = JSON.parse(value);
      } catch {
        // Invalid JSON, use defaults
      }
    }

    res.json({
      kpi_key: kpiKey,
      label: KPI_LABELS[kpiKey] || kpiKey,
      enabled: preference.enabled || false,
      email: preference.email || null,
    });
  } catch (error) {
    console.error(`GET /api/email-preferences/${req.params.kpiKey} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/email-preferences/:kpiKey
 * Set preference for a KPI
 */
router.put('/:kpiKey', async (req, res) => {
  try {
    const { kpiKey } = req.params;
    const { enabled, email } = req.body;

    if (!VALID_KPI_KEYS.includes(kpiKey)) {
      return res.status(400).json({ error: `Invalid KPI key: ${kpiKey}` });
    }

    // Validate email if enabled and email provided
    if (enabled && email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Email is required when enabling
    if (enabled && !email) {
      return res.status(400).json({ error: 'Email is required when enabling notifications' });
    }

    const settingKey = `email_pref_${kpiKey}`;
    const preference = { enabled: Boolean(enabled), email: email || null };

    await UserSettingsService.set(req.user.id, settingKey, JSON.stringify(preference));

    res.json({
      success: true,
      kpi_key: kpiKey,
      enabled: preference.enabled,
      email: preference.email,
    });
  } catch (error) {
    console.error(`PUT /api/email-preferences/${req.params.kpiKey} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/email-preferences/:kpiKey
 * Delete preference for a KPI
 */
router.delete('/:kpiKey', async (req, res) => {
  try {
    const { kpiKey } = req.params;

    if (!VALID_KPI_KEYS.includes(kpiKey)) {
      return res.status(400).json({ error: `Invalid KPI key: ${kpiKey}` });
    }

    const settingKey = `email_pref_${kpiKey}`;
    await UserSettingsService.delete(req.user.id, settingKey);

    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/email-preferences/${req.params.kpiKey} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
