import express from 'express';
import WorkItemService from '../services/WorkItemService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/work-items
 * List all work items for the authenticated user
 * Query params: team_member_id, status
 */
router.get('/', async (req, res) => {
  try {
    const { team_member_id, status } = req.query;
    const workItems = await WorkItemService.list(req.user.id, team_member_id, status);
    res.json(workItems);
  } catch (error) {
    console.error('GET /api/work-items error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/work-items/:id
 * Get a single work item
 */
router.get('/:id', async (req, res) => {
  try {
    const workItem = await WorkItemService.get(req.user.id, req.params.id);
    res.json(workItem);
  } catch (error) {
    console.error(`GET /api/work-items/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /api/work-items
 * Create a new work item
 */
router.post('/', async (req, res) => {
  try {
    const workItem = await WorkItemService.create(req.user.id, req.body);
    res.status(201).json(workItem);
  } catch (error) {
    console.error('POST /api/work-items error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/work-items/:id
 * Update an existing work item
 */
router.put('/:id', async (req, res) => {
  try {
    const workItem = await WorkItemService.update(req.user.id, req.params.id, req.body);
    res.json(workItem);
  } catch (error) {
    console.error(`PUT /api/work-items/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * DELETE /api/work-items/:id
 * Delete a work item
 */
router.delete('/:id', async (req, res) => {
  try {
    await WorkItemService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/work-items/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * POST /api/work-items/:id/insights
 * Add an insight to a work item
 */
router.post('/:id/insights', async (req, res) => {
  try {
    const { text, type } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }
    const workItem = await WorkItemService.addInsight(req.user.id, req.params.id, { text, type });
    res.status(201).json(workItem);
  } catch (error) {
    console.error(`POST /api/work-items/${req.params.id}/insights error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
