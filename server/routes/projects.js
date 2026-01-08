import express from 'express';
import ProjectService from '../services/ProjectService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { orderBy } = req.query;
    const projects = await ProjectService.list(req.user.id, orderBy);
    res.json(projects);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const project = await ProjectService.create(req.user.id, req.body);
    res.status(201).json(project);
  } catch (error) {
    console.error('POST /api/projects error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const project = await ProjectService.update(req.user.id, req.params.id, req.body);
    res.json(project);
  } catch (error) {
    console.error(`PUT /api/projects/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ProjectService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/projects/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
