import express from 'express';
import NotificationService from '../services/NotificationService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const notifications = await NotificationService.list(req.user.id);
    res.json(notifications);
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const notification = await NotificationService.get(req.user.id, req.params.id);
    res.json(notification);
  } catch (error) {
    console.error(`GET /api/notifications/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const notification = await NotificationService.create(req.user.id, req.body);
    res.status(201).json(notification);
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const notification = await NotificationService.update(req.user.id, req.params.id, req.body);
    res.json(notification);
  } catch (error) {
    console.error(`PUT /api/notifications/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await NotificationService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/notifications/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
