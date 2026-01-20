import express from 'express';
import PerformanceEvaluationService from '../services/PerformanceEvaluationService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/performance-evaluations
 * List performance evaluations for a team member (current and previous year)
 * Query params: team_member_id (required)
 */
router.get('/', async (req, res) => {
  try {
    const { team_member_id } = req.query;

    if (!team_member_id) {
      return res.status(400).json({ error: 'team_member_id is required' });
    }

    const evaluations = await PerformanceEvaluationService.list(
      req.user.id,
      team_member_id
    );
    res.json(evaluations);
  } catch (error) {
    console.error('GET /api/performance-evaluations error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/performance-evaluations/by-year
 * Get a specific year's evaluation for a team member
 * Query params: team_member_id (required), year (required)
 */
router.get('/by-year', async (req, res) => {
  try {
    const { team_member_id, year } = req.query;

    if (!team_member_id || !year) {
      return res.status(400).json({ error: 'team_member_id and year are required' });
    }

    const evaluation = await PerformanceEvaluationService.getByYear(
      req.user.id,
      team_member_id,
      parseInt(year, 10)
    );

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found for this year' });
    }

    res.json(evaluation);
  } catch (error) {
    console.error('GET /api/performance-evaluations/by-year error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/performance-evaluations/:id
 * Get a single performance evaluation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluationService.get(req.user.id, req.params.id);
    if (!evaluation) {
      return res.status(404).json({ error: 'Performance evaluation not found' });
    }
    res.json(evaluation);
  } catch (error) {
    console.error(`GET /api/performance-evaluations/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/performance-evaluations
 * Create a new performance evaluation
 */
router.post('/', async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluationService.create(req.user.id, req.body);
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('POST /api/performance-evaluations error:', error);
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * PUT /api/performance-evaluations/:id
 * Update an existing performance evaluation
 */
router.put('/:id', async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluationService.update(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json(evaluation);
  } catch (error) {
    console.error(`PUT /api/performance-evaluations/${req.params.id} error:`, error);
    let statusCode = 400;
    if (error.message.includes('not found')) statusCode = 404;
    if (error.message.includes('previous years')) statusCode = 403;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * DELETE /api/performance-evaluations/:id
 * Delete a performance evaluation (current year only)
 */
router.delete('/:id', async (req, res) => {
  try {
    await PerformanceEvaluationService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/performance-evaluations/${req.params.id} error:`, error);
    let statusCode = 400;
    if (error.message.includes('not found')) statusCode = 404;
    if (error.message.includes('previous years')) statusCode = 403;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
