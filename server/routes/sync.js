import express from 'express';
import SyncItemService from '../services/SyncItemService.js';
import SubtaskService from '../services/SubtaskService.js';
import SyncSettingsService from '../services/SyncSettingsService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/sync
 * List sync items with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { category, teamDepartment, archived } = req.query;

    // Map camelCase teamDepartment to snake_case team_department
    const filters = {
      category,
      team_department: teamDepartment,
      archived: archived === 'true' // Convert string to boolean
    };

    const syncItems = await SyncItemService.list(req.user.id, filters);
    res.json(syncItems);
  } catch (error) {
    console.error('GET /api/sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sync/archived
 * Get archived sync items with optional date filtering
 */
router.get('/archived', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    const filters = {
      from_date,
      to_date
    };

    const archivedItems = await SyncItemService.getArchived(req.user.id, filters);
    res.json(archivedItems);
  } catch (error) {
    console.error('GET /api/sync/archived error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sync/archived/count
 * Get count of archived sync items for badge display
 */
router.get('/archived/count', async (req, res) => {
  try {
    const count = await SyncItemService.getArchivedCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('GET /api/sync/archived/count error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sync/settings
 * Get user sync settings (returns defaults if none exist)
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await SyncSettingsService.get(req.user.id);
    res.json(settings);
  } catch (error) {
    console.error('GET /api/sync/settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/sync/settings
 * Update user sync settings (upsert)
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = await SyncSettingsService.update(req.user.id, req.body);
    res.json(settings);
  } catch (error) {
    console.error('PUT /api/sync/settings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/sync
 * Create a new sync item
 */
router.post('/', async (req, res) => {
  try {
    const syncItem = await SyncItemService.create(req.user.id, req.body);
    res.status(201).json(syncItem);
  } catch (error) {
    console.error('POST /api/sync error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/sync/:id
 * Get a single sync item
 */
router.get('/:id', async (req, res) => {
  try {
    const syncItem = await SyncItemService.get(req.user.id, req.params.id);
    res.json(syncItem);
  } catch (error) {
    console.error(`GET /api/sync/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * PUT /api/sync/:id
 * Update a sync item
 */
router.put('/:id', async (req, res) => {
  try {
    const syncItem = await SyncItemService.update(req.user.id, req.params.id, req.body);
    res.json(syncItem);
  } catch (error) {
    console.error(`PUT /api/sync/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * DELETE /api/sync/:id
 * Delete a sync item (cascades to subtasks)
 */
router.delete('/:id', async (req, res) => {
  try {
    await SyncItemService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/sync/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * PUT /api/sync/:id/restore
 * Restore an archived sync item
 */
router.put('/:id/restore', async (req, res) => {
  try {
    const syncItem = await SyncItemService.restore(req.user.id, req.params.id);
    res.json(syncItem);
  } catch (error) {
    console.error(`PUT /api/sync/${req.params.id}/restore error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
