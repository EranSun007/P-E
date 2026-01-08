import express from 'express';
import TaskService from '../services/TaskService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/tasks
 * List all tasks for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { orderBy } = req.query;
    const tasks = await TaskService.list(req.user.id, orderBy);
    res.json(tasks);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const task = await TaskService.create(req.user.id, req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/tasks/:id
 * Update an existing task
 */
router.put('/:id', async (req, res) => {
  try {
    const task = await TaskService.update(req.user.id, req.params.id, req.body);
    res.json(task);
  } catch (error) {
    console.error(`PUT /api/tasks/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    await TaskService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/tasks/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
