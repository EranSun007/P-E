import express from 'express';
import ReminderService from '../services/ReminderService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const reminders = await ReminderService.list(req.user.id);
    res.json(reminders);
  } catch (error) {
    console.error('GET /api/reminders error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const reminder = await ReminderService.get(req.user.id, req.params.id);
    res.json(reminder);
  } catch (error) {
    console.error(`GET /api/reminders/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const reminder = await ReminderService.create(req.user.id, req.body);
    res.status(201).json(reminder);
  } catch (error) {
    console.error('POST /api/reminders error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const reminder = await ReminderService.update(req.user.id, req.params.id, req.body);
    res.json(reminder);
  } catch (error) {
    console.error(`PUT /api/reminders/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ReminderService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/reminders/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
