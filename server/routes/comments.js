import express from 'express';
import CommentService from '../services/CommentService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const comments = await CommentService.list(req.user.id);
    res.json(comments);
  } catch (error) {
    console.error('GET /api/comments error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const comment = await CommentService.get(req.user.id, req.params.id);
    res.json(comment);
  } catch (error) {
    console.error(`GET /api/comments/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const comment = await CommentService.create(req.user.id, req.body);
    res.status(201).json(comment);
  } catch (error) {
    console.error('POST /api/comments error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const comment = await CommentService.update(req.user.id, req.params.id, req.body);
    res.json(comment);
  } catch (error) {
    console.error(`PUT /api/comments/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await CommentService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/comments/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
