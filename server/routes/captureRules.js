import express from 'express';
import CaptureService from '../services/CaptureService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================
// Capture Rules CRUD Operations
// ============================================

/**
 * GET /api/capture-rules
 * List all capture rules for the current user
 * Query params: enabled (boolean)
 */
router.get('/', async (req, res) => {
  try {
    const { enabled } = req.query;
    const filters = {};

    if (enabled !== undefined) {
      filters.enabled = enabled === 'true';
    }

    const rules = await CaptureService.listRules(req.user.id, filters);
    res.json(rules);
  } catch (error) {
    console.error('GET /api/capture-rules error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/capture-rules/:id
 * Get a single capture rule by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const rule = await CaptureService.getRule(req.user.id, req.params.id);

    if (!rule) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Capture rule not found'
      });
    }

    res.json(rule);
  } catch (error) {
    console.error(`GET /api/capture-rules/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/capture-rules
 * Create a new capture rule
 * Body: { name, url_pattern, selectors, description?, enabled?, metadata? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, url_pattern, selectors, description, enabled, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'name is required'
      });
    }

    if (!url_pattern) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'url_pattern is required'
      });
    }

    const rule = await CaptureService.createRule(req.user.id, {
      name,
      url_pattern,
      selectors,
      description,
      enabled,
      metadata
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('POST /api/capture-rules error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * PUT /api/capture-rules/:id
 * Update an existing capture rule
 * Body: { name?, url_pattern?, selectors?, description?, enabled?, metadata? }
 */
router.put('/:id', async (req, res) => {
  try {
    const rule = await CaptureService.updateRule(req.user.id, req.params.id, req.body);

    if (!rule) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Capture rule not found'
      });
    }

    res.json(rule);
  } catch (error) {
    console.error(`PUT /api/capture-rules/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * DELETE /api/capture-rules/:id
 * Delete a capture rule
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CaptureService.deleteRule(req.user.id, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Capture rule not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/capture-rules/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
