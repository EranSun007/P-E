import express from 'express';
import TaskAttributeService from '../services/TaskAttributeService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const attributes = await TaskAttributeService.list(req.user.id);
    res.json(attributes);
  } catch (error) {
    console.error('GET /api/task-attributes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const attribute = await TaskAttributeService.create(req.user.id, req.body);
    res.status(201).json(attribute);
  } catch (error) {
    console.error('POST /api/task-attributes error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const attribute = await TaskAttributeService.update(req.user.id, req.params.id, req.body);
    res.json(attribute);
  } catch (error) {
    console.error(`PUT /api/task-attributes/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await TaskAttributeService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/task-attributes/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
