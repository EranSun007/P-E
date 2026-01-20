import express from 'express';
import DeveloperGoalService from '../services/DeveloperGoalService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/developer-goals
 * List developer goals for a team member, optionally filtered by year
 * Query params: team_member_id (required), year (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { team_member_id, year } = req.query;

    if (!team_member_id) {
      return res.status(400).json({ error: 'team_member_id is required' });
    }

    const goals = await DeveloperGoalService.list(
      req.user.id,
      team_member_id,
      year ? parseInt(year, 10) : null
    );
    res.json(goals);
  } catch (error) {
    console.error('GET /api/developer-goals error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/developer-goals/:id
 * Get a single developer goal
 */
router.get('/:id', async (req, res) => {
  try {
    const goal = await DeveloperGoalService.get(req.user.id, req.params.id);
    if (!goal) {
      return res.status(404).json({ error: 'Developer goal not found' });
    }
    res.json(goal);
  } catch (error) {
    console.error(`GET /api/developer-goals/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/developer-goals
 * Create a new developer goal
 */
router.post('/', async (req, res) => {
  try {
    const goal = await DeveloperGoalService.create(req.user.id, req.body);
    res.status(201).json(goal);
  } catch (error) {
    console.error('POST /api/developer-goals error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/developer-goals/:id
 * Update an existing developer goal
 */
router.put('/:id', async (req, res) => {
  try {
    const goal = await DeveloperGoalService.update(req.user.id, req.params.id, req.body);
    res.json(goal);
  } catch (error) {
    console.error(`PUT /api/developer-goals/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * DELETE /api/developer-goals/:id
 * Delete a developer goal
 */
router.delete('/:id', async (req, res) => {
  try {
    await DeveloperGoalService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/developer-goals/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
