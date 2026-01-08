import express from 'express';
import CalendarEventService from '../services/CalendarEventService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const events = await CalendarEventService.list(req.user.id);
    res.json(events);
  } catch (error) {
    console.error('GET /api/calendar-events error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await CalendarEventService.get(req.user.id, req.params.id);
    res.json(event);
  } catch (error) {
    console.error(`GET /api/calendar-events/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const event = await CalendarEventService.create(req.user.id, req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('POST /api/calendar-events error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const event = await CalendarEventService.update(req.user.id, req.params.id, req.body);
    res.json(event);
  } catch (error) {
    console.error(`PUT /api/calendar-events/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await CalendarEventService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/calendar-events/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
