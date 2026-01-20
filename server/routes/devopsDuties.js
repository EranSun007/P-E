import express from 'express';
import DevOpsDutyService from '../services/DevOpsDutyService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/devops-duties
 * List all DevOps duties for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const duties = await DevOpsDutyService.list(req.user.id);
    res.json(duties);
  } catch (error) {
    console.error('GET /api/devops-duties error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devops-duties/team-member/:teamMemberId
 * List DevOps duties for a specific team member
 */
router.get('/team-member/:teamMemberId', async (req, res) => {
  try {
    const duties = await DevOpsDutyService.listByTeamMember(req.user.id, req.params.teamMemberId);
    res.json(duties);
  } catch (error) {
    console.error(`GET /api/devops-duties/team-member/${req.params.teamMemberId} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devops-duties/:id
 * Get a single DevOps duty
 */
router.get('/:id', async (req, res) => {
  try {
    const duty = await DevOpsDutyService.get(req.user.id, req.params.id);
    res.json(duty);
  } catch (error) {
    console.error(`GET /api/devops-duties/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /api/devops-duties
 * Create a new DevOps duty
 */
router.post('/', async (req, res) => {
  try {
    const duty = await DevOpsDutyService.create(req.user.id, req.body);
    res.status(201).json(duty);
  } catch (error) {
    console.error('POST /api/devops-duties error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/devops-duties/:id
 * Update an existing DevOps duty
 */
router.put('/:id', async (req, res) => {
  try {
    const duty = await DevOpsDutyService.update(req.user.id, req.params.id, req.body);
    res.json(duty);
  } catch (error) {
    console.error(`PUT /api/devops-duties/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * DELETE /api/devops-duties/:id
 * Delete a DevOps duty
 */
router.delete('/:id', async (req, res) => {
  try {
    await DevOpsDutyService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/devops-duties/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /api/devops-duties/:id/insights
 * Add an insight to a DevOps duty
 */
router.post('/:id/insights', async (req, res) => {
  try {
    const { insight } = req.body;
    if (!insight) {
      return res.status(400).json({ error: 'Missing required field: insight' });
    }
    const duty = await DevOpsDutyService.addInsight(req.user.id, req.params.id, insight);
    res.status(201).json(duty);
  } catch (error) {
    console.error(`POST /api/devops-duties/${req.params.id}/insights error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /api/devops-duties/:id/complete
 * Mark a DevOps duty as completed with end metrics
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const duty = await DevOpsDutyService.complete(req.user.id, req.params.id, req.body);
    res.json(duty);
  } catch (error) {
    console.error(`POST /api/devops-duties/${req.params.id}/complete error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
