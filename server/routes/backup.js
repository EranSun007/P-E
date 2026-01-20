import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import BackupService from '../services/BackupService.js';

const router = express.Router();

// Apply auth middleware to all backup routes
router.use(authMiddleware);

// GET /api/backup/export - Export all user data
router.get('/export', async (req, res) => {
  try {
    const data = await BackupService.exportAll(req.user.id);
    res.json(data);
  } catch (error) {
    console.error('GET /api/backup/export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export data' });
  }
});

// POST /api/backup/import - Import user data
router.post('/import', async (req, res) => {
  try {
    const { data, mode = 'merge' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing backup data' });
    }

    if (!['merge', 'replace'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "merge" or "replace"' });
    }

    const summary = await BackupService.importAll(req.user.id, data, mode);
    res.json({
      status: 'ok',
      message: 'Import completed successfully',
      mode,
      summary
    });
  } catch (error) {
    console.error('POST /api/backup/import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import data' });
  }
});

export default router;
