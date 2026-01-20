import express from 'express';
import DutyScheduleService from '../services/DutyScheduleService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/duty-schedule
 * List all duty schedules with optional filters
 * Query params: team, duty_type
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { team, duty_type } = req.query;

    const duties = await DutyScheduleService.list(userId, { team, duty_type });
    res.json(duties);
  } catch (error) {
    console.error('GET /duty-schedule error:', error);
    res.status(500).json({ error: error.message || 'Failed to list duty schedules' });
  }
});

/**
 * GET /api/duty-schedule/upcoming
 * Get upcoming duties (next 3 months)
 * Query params: team
 */
router.get('/upcoming', async (req, res) => {
  try {
    const userId = req.user.id;
    const { team } = req.query;

    const duties = await DutyScheduleService.getUpcoming(userId, team);
    res.json(duties);
  } catch (error) {
    console.error('GET /duty-schedule/upcoming error:', error);
    res.status(500).json({ error: error.message || 'Failed to get upcoming duty schedules' });
  }
});

/**
 * GET /api/duty-schedule/date-range
 * Get duties within a date range (for calendar)
 * Query params: start_date, end_date, team, duty_type
 */
router.get('/date-range', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, team, duty_type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const duties = await DutyScheduleService.listByDateRange(
      userId,
      start_date,
      end_date,
      { team, duty_type }
    );
    res.json(duties);
  } catch (error) {
    console.error('GET /duty-schedule/date-range error:', error);
    res.status(500).json({ error: error.message || 'Failed to get duty schedules by date range' });
  }
});

/**
 * GET /api/duty-schedule/team-members/:department
 * Get team members by department for duty assignment
 */
router.get('/team-members/:department', async (req, res) => {
  try {
    const userId = req.user.id;
    const { department } = req.params;

    const members = await DutyScheduleService.getTeamMembersByDepartment(userId, department);
    res.json(members);
  } catch (error) {
    console.error('GET /duty-schedule/team-members/:department error:', error);
    res.status(500).json({ error: error.message || 'Failed to get team members' });
  }
});

/**
 * GET /api/duty-schedule/:id
 * Get a single duty schedule by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const duty = await DutyScheduleService.get(userId, id);
    res.json(duty);
  } catch (error) {
    console.error('GET /duty-schedule/:id error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to get duty schedule' });
  }
});

/**
 * POST /api/duty-schedule
 * Create a new duty schedule
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const dutyData = req.body;

    const duty = await DutyScheduleService.create(userId, dutyData);
    res.status(201).json(duty);
  } catch (error) {
    console.error('POST /duty-schedule error:', error);
    const status = error.message.includes('Missing required') ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to create duty schedule' });
  }
});

/**
 * PUT /api/duty-schedule/:id
 * Update a duty schedule
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const duty = await DutyScheduleService.update(userId, id, updates);
    res.json(duty);
  } catch (error) {
    console.error('PUT /duty-schedule/:id error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to update duty schedule' });
  }
});

/**
 * DELETE /api/duty-schedule/:id
 * Delete a duty schedule
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await DutyScheduleService.delete(userId, id);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /duty-schedule/:id error:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to delete duty schedule' });
  }
});

export default router;
