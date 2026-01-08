import express from 'express';
import MeetingService from '../services/MeetingService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const meetings = await MeetingService.list(req.user.id);
    res.json(meetings);
  } catch (error) {
    console.error('GET /api/meetings error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const meeting = await MeetingService.get(req.user.id, req.params.id);
    res.json(meeting);
  } catch (error) {
    console.error(`GET /api/meetings/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const meeting = await MeetingService.create(req.user.id, req.body);
    res.status(201).json(meeting);
  } catch (error) {
    console.error('POST /api/meetings error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const meeting = await MeetingService.update(req.user.id, req.params.id, req.body);
    res.json(meeting);
  } catch (error) {
    console.error(`PUT /api/meetings/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await MeetingService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/meetings/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
