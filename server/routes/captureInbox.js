import express from 'express';
import CaptureService from '../services/CaptureService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================
// Capture Inbox Operations
// ============================================

/**
 * GET /api/capture-inbox
 * List all inbox items for the current user
 * Query params: status, rule_id
 */
router.get('/', async (req, res) => {
  try {
    const { status, rule_id } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (rule_id) filters.rule_id = rule_id;

    const items = await CaptureService.listInboxItems(req.user.id, filters);
    res.json(items);
  } catch (error) {
    console.error('GET /api/capture-inbox error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/capture-inbox/bulk-accept
 * Bulk accept inbox items
 * Body: { item_ids, target_entity_type?, target_entity_id?, create_mapping? }
 * Note: Define BEFORE /:id routes to avoid conflicts
 */
router.post('/bulk-accept', async (req, res) => {
  try {
    const { item_ids, target_entity_type, target_entity_id, create_mapping } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'item_ids array is required and must not be empty'
      });
    }

    const mapping = { target_entity_type, target_entity_id, create_mapping };
    const items = await CaptureService.bulkAccept(req.user.id, item_ids, mapping);
    res.json(items);
  } catch (error) {
    console.error('POST /api/capture-inbox/bulk-accept error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/capture-inbox/bulk-reject
 * Bulk reject inbox items
 * Body: { item_ids }
 * Note: Define BEFORE /:id routes to avoid conflicts
 */
router.post('/bulk-reject', async (req, res) => {
  try {
    const { item_ids } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'item_ids array is required and must not be empty'
      });
    }

    const items = await CaptureService.bulkReject(req.user.id, item_ids);
    res.json(items);
  } catch (error) {
    console.error('POST /api/capture-inbox/bulk-reject error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/capture-inbox/:id/accept
 * Accept an inbox item (mark as processed)
 * Body: { target_entity_type?, target_entity_id?, create_mapping? }
 * Note: Define BEFORE /:id GET to avoid conflicts
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const { target_entity_type, target_entity_id, create_mapping } = req.body;

    const item = await CaptureService.acceptInboxItem(req.user.id, req.params.id, {
      target_entity_type,
      target_entity_id,
      create_mapping
    });

    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inbox item not found'
      });
    }

    res.json(item);
  } catch (error) {
    console.error(`POST /api/capture-inbox/${req.params.id}/accept error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/capture-inbox/:id/reject
 * Reject an inbox item
 * Note: Define BEFORE /:id GET to avoid conflicts
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const item = await CaptureService.rejectInboxItem(req.user.id, req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inbox item not found'
      });
    }

    res.json(item);
  } catch (error) {
    console.error(`POST /api/capture-inbox/${req.params.id}/reject error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/capture-inbox/:id
 * Get a single inbox item by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await CaptureService.getInboxItem(req.user.id, req.params.id);

    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Inbox item not found'
      });
    }

    res.json(item);
  } catch (error) {
    console.error(`GET /api/capture-inbox/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/capture-inbox
 * Create a new inbox item (from extension)
 * Body: { rule_id?, rule_name?, source_url, source_identifier?, captured_data }
 */
router.post('/', async (req, res) => {
  try {
    const { rule_id, rule_name, source_url, source_identifier, captured_data } = req.body;

    if (!source_url) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'source_url is required'
      });
    }

    if (!captured_data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'captured_data is required'
      });
    }

    const item = await CaptureService.createInboxItem(req.user.id, {
      rule_id,
      rule_name,
      source_url,
      source_identifier,
      captured_data
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('POST /api/capture-inbox error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
