import express from 'express';
import multer from 'multer';
import BugService from '../services/BugService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================
// Upload Operations (API-01 in Phase 11)
// ============================================

/**
 * POST /api/bugs/upload
 * Upload CSV file and process bugs
 * Body (multipart/form-data): csvFile, weekEnding
 */
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    const { weekEnding } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'CSV file is required'
      });
    }

    if (!weekEnding) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'weekEnding date is required'
      });
    }

    // Validate weekEnding is a Saturday
    const weekEndingDate = new Date(weekEnding);
    if (weekEndingDate.getDay() !== 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'weekEnding must be a Saturday'
      });
    }

    const result = await BugService.uploadCSV(
      req.user.id,
      req.file.buffer,
      req.file.originalname,
      weekEnding
    );

    res.json(result);
  } catch (error) {
    console.error('POST /api/bugs/upload error:', error);

    // Return user-friendly error for CSV issues
    if (error.message.includes('Missing required columns')) {
      return res.status(400).json({
        error: 'Invalid CSV',
        message: error.message
      });
    }

    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Upload List (API-02)
// ============================================

/**
 * GET /api/bugs/uploads
 * List all uploaded weeks for dropdown
 */
router.get('/uploads', async (req, res) => {
  try {
    const uploads = await BugService.listUploads(req.user.id);
    res.json(uploads);
  } catch (error) {
    console.error('GET /api/bugs/uploads error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// KPIs (API-03)
// ============================================

/**
 * GET /api/bugs/kpis
 * Get KPIs for an upload and optional component
 * Query params: uploadId (required), component (optional)
 */
router.get('/kpis', async (req, res) => {
  try {
    const { uploadId, component } = req.query;

    if (!uploadId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'uploadId is required'
      });
    }

    const kpis = await BugService.getKPIs(
      req.user.id,
      uploadId,
      component || null
    );

    if (!kpis) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'KPIs not found for specified upload and component'
      });
    }

    res.json(kpis);
  } catch (error) {
    console.error('GET /api/bugs/kpis error:', error);

    if (error.message === 'Upload not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Bug List (API-04)
// ============================================

/**
 * GET /api/bugs/list
 * Get bugs for an upload with filtering and pagination
 * Query params: uploadId (required), priority, status, component, limit, offset
 */
router.get('/list', async (req, res) => {
  try {
    const { uploadId, priority, status, component, limit, offset } = req.query;

    if (!uploadId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'uploadId is required'
      });
    }

    const filters = {};
    if (priority) filters.priority = priority;
    if (status) filters.status = status;
    if (component) filters.component = component;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const bugs = await BugService.listBugs(req.user.id, uploadId, filters);
    res.json(bugs);
  } catch (error) {
    console.error('GET /api/bugs/list error:', error);

    if (error.message === 'Upload not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Delete Upload (API-05)
// ============================================

/**
 * DELETE /api/bugs/uploads/:id
 * Delete an upload (cascades to bugs and KPIs)
 */
router.delete('/uploads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await BugService.deleteUpload(req.user.id, id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Upload not found'
      });
    }

    res.json({ success: true, message: 'Upload deleted' });
  } catch (error) {
    console.error('DELETE /api/bugs/uploads/:id error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// ============================================
// Check Duplicate (for frontend validation)
// ============================================

/**
 * GET /api/bugs/uploads/check
 * Check if upload exists for a week (for duplicate detection)
 * Query params: weekEnding
 */
router.get('/uploads/check', async (req, res) => {
  try {
    const { weekEnding } = req.query;

    if (!weekEnding) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'weekEnding is required'
      });
    }

    const existing = await BugService.getUploadByWeek(req.user.id, weekEnding);
    res.json({ exists: !!existing, upload: existing });
  } catch (error) {
    console.error('GET /api/bugs/uploads/check error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
