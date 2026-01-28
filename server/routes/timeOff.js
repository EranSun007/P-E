import express from 'express';
import TimeOffService from '../services/TimeOffService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/time-off
 * List all time off entries with optional filters
 * Query params: team_member_id, type, status
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { team_member_id, type, status } = req.query;

    const timeOffs = await TimeOffService.list(userId, { team_member_id, type, status });
    res.json(timeOffs);
  } catch (error) {
    console.error('GET /time-off error:', error);
    res.status(500).json({ error: error.message || 'Failed to list time off entries' });
  }
});

/**
 * GET /api/time-off/date-range
 * Get time off entries within a date range (for calendar)
 * Query params: start_date, end_date, team_member_id, type
 */
router.get('/date-range', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, team_member_id, type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const timeOffs = await TimeOffService.getByDateRange(
      userId,
      start_date,
      end_date,
      { team_member_id, type }
    );
    res.json(timeOffs);
  } catch (error) {
    console.error('GET /time-off/date-range error:', error);
    res.status(500).json({ error: error.message || 'Failed to get time off by date range' });
  }
});

/**
 * GET /api/time-off/upcoming
 * Get upcoming time off entries (next 30 days by default)
 * Query params: days
 */
router.get('/upcoming', async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const timeOffs = await TimeOffService.getUpcoming(userId, days);
    res.json(timeOffs);
  } catch (error) {
    console.error('GET /time-off/upcoming error:', error);
    res.status(500).json({ error: error.message || 'Failed to get upcoming time off' });
  }
});

/**
 * GET /api/time-off/team-member/:teamMemberId
 * Get time off for a specific team member
 */
router.get('/team-member/:teamMemberId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamMemberId } = req.params;

    const timeOffs = await TimeOffService.getByTeamMember(userId, teamMemberId);
    res.json(timeOffs);
  } catch (error) {
    console.error('GET /time-off/team-member/:teamMemberId error:', error);
    res.status(500).json({ error: error.message || 'Failed to get time off by team member' });
  }
});

/**
 * GET /api/time-off/:id
 * Get a single time off entry by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const timeOff = await TimeOffService.get(userId, id);
    res.json(timeOff);
  } catch (error) {
    console.error('GET /time-off/:id error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to get time off entry' });
  }
});

/**
 * POST /api/time-off
 * Create a new time off entry
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const timeOffData = req.body;

    const timeOff = await TimeOffService.create(userId, timeOffData);
    res.status(201).json(timeOff);
  } catch (error) {
    console.error('POST /time-off error:', error);
    const status = error.message.includes('Missing required') ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to create time off entry' });
  }
});

/**
 * PUT /api/time-off/:id
 * Update a time off entry
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const timeOff = await TimeOffService.update(userId, id, updates);
    res.json(timeOff);
  } catch (error) {
    console.error('PUT /time-off/:id error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to update time off entry' });
  }
});

/**
 * DELETE /api/time-off/:id
 * Delete a time off entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await TimeOffService.delete(userId, id);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /time-off/:id error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to delete time off entry' });
  }
});

export default router;
