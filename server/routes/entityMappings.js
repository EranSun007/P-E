import express from 'express';
import CaptureService from '../services/CaptureService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================
// Entity Mappings Operations
// ============================================

/**
 * GET /api/entity-mappings
 * List all entity mappings for the current user
 * Query params: source_type, target_entity_type
 */
router.get('/', async (req, res) => {
  try {
    const { source_type, target_entity_type } = req.query;
    const filters = {};

    if (source_type) filters.source_type = source_type;
    if (target_entity_type) filters.target_entity_type = target_entity_type;

    const mappings = await CaptureService.listMappings(req.user.id, filters);
    res.json(mappings);
  } catch (error) {
    console.error('GET /api/entity-mappings error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/entity-mappings/lookup/:source
 * Find a mapping by source identifier (URL-encoded)
 * Note: Define BEFORE /:id to avoid conflicts
 */
router.get('/lookup/:source', async (req, res) => {
  try {
    const sourceIdentifier = decodeURIComponent(req.params.source);
    const mapping = await CaptureService.getMappingBySource(req.user.id, sourceIdentifier);

    if (!mapping) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Mapping not found for source identifier'
      });
    }

    res.json(mapping);
  } catch (error) {
    console.error(`GET /api/entity-mappings/lookup/${req.params.source} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/entity-mappings/:id
 * Get a single entity mapping by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const mapping = await CaptureService.getMapping(req.user.id, req.params.id);

    if (!mapping) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Entity mapping not found'
      });
    }

    res.json(mapping);
  } catch (error) {
    console.error(`GET /api/entity-mappings/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/entity-mappings
 * Create or update an entity mapping (upsert)
 * Body: { source_identifier, target_entity_type, target_entity_id, source_type?, source_display_name?, auto_apply? }
 */
router.post('/', async (req, res) => {
  try {
    const {
      source_identifier,
      target_entity_type,
      target_entity_id,
      source_type,
      source_display_name,
      auto_apply
    } = req.body;

    if (!source_identifier) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'source_identifier is required'
      });
    }

    if (!target_entity_type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'target_entity_type is required'
      });
    }

    if (!target_entity_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'target_entity_id is required'
      });
    }

    const mapping = await CaptureService.createOrUpdateMapping(req.user.id, {
      source_identifier,
      target_entity_type,
      target_entity_id,
      source_type,
      source_display_name,
      auto_apply
    });

    res.status(201).json(mapping);
  } catch (error) {
    console.error('POST /api/entity-mappings error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * DELETE /api/entity-mappings/:id
 * Delete an entity mapping
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CaptureService.deleteMapping(req.user.id, req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Entity mapping not found'
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/entity-mappings/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
