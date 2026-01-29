import express from 'express';
import TeamSummaryService from '../services/TeamSummaryService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const service = new TeamSummaryService();

/**
 * GET / - List summaries with filters
 * Query: { teamDepartment, startDate, endDate, limit }
 */
router.get('/', async (req, res) => {
  try {
    const { teamDepartment, startDate, endDate, limit } = req.query;
    const summaries = await service.list(req.user.id, {
      teamDepartment,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined
    });
    res.json({ summaries, total: summaries.length });
  } catch (error) {
    console.error('GET /api/team-summaries error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST / - Create summary (UPSERT)
 * Body: { memberId, memberName, teamDepartment, weekEndingDate, completedCount, blockerCount, oneLine, items, lastUpdateDays }
 */
router.post('/', async (req, res) => {
  try {
    const summary = await service.create(req.user.id, req.body);
    res.status(201).json(summary);
  } catch (error) {
    console.error('POST /api/team-summaries error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /:memberId/:weekEndingDate - Get specific summary by member and week
 */
router.get('/:memberId/:weekEndingDate', async (req, res) => {
  try {
    const { memberId, weekEndingDate } = req.params;
    const summary = await service.getByMember(req.user.id, memberId, weekEndingDate);

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json(summary);
  } catch (error) {
    console.error('GET /api/team-summaries/:memberId/:weekEndingDate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /:id - Update summary
 * Body: { memberName, teamDepartment, weekEndingDate, completedCount, blockerCount, oneLine, items, lastUpdateDays }
 */
router.put('/:id', async (req, res) => {
  try {
    const summary = await service.update(req.user.id, req.params.id, req.body);
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    res.json(summary);
  } catch (error) {
    console.error('PUT /api/team-summaries/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /:id - Delete summary
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await service.delete(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /api/team-summaries/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
