import express from 'express';
import OneOnOneComplianceService from '../services/OneOnOneComplianceService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/metrics/one-on-one-compliance
 *
 * Returns 1:1 meeting compliance data based on role-specific cadences.
 *
 * Query params:
 *   - rollingDays: 30 | 60 | 90 (default: 30)
 *
 * Response:
 *   - summary: { total, eligible, onTrack, overdue, excluded, compliancePercent }
 *   - members: Array of member compliance details
 *   - cadenceRules: Role to cadence days mapping
 */
router.get('/one-on-one-compliance', async (req, res) => {
  try {
    const rollingDays = parseInt(req.query.rollingDays, 10) || 30;

    // Validate rolling days parameter
    if (![30, 60, 90].includes(rollingDays)) {
      return res.status(400).json({
        error: 'Invalid rollingDays parameter. Must be 30, 60, or 90.'
      });
    }

    const compliance = await OneOnOneComplianceService.getCompliance(
      req.user.id,
      rollingDays
    );

    res.json(compliance);
  } catch (error) {
    console.error('GET /api/metrics/one-on-one-compliance error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics/one-on-one-compliance/cadence-rules
 *
 * Returns the configured cadence rules per role.
 */
router.get('/one-on-one-compliance/cadence-rules', async (_req, res) => {
  try {
    const cadenceRules = OneOnOneComplianceService.getCadenceRules();
    res.json(cadenceRules);
  } catch (error) {
    console.error('GET /api/metrics/one-on-one-compliance/cadence-rules error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
