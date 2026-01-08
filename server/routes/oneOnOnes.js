import express from 'express';
import OneOnOneService from '../services/OneOnOneService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const oneOnOnes = await OneOnOneService.list(req.user.id);
    res.json(oneOnOnes);
  } catch (error) {
    console.error('GET /api/one-on-ones error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const oneOnOne = await OneOnOneService.create(req.user.id, req.body);
    res.status(201).json(oneOnOne);
  } catch (error) {
    console.error('POST /api/one-on-ones error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const oneOnOne = await OneOnOneService.update(req.user.id, req.params.id, req.body);
    res.json(oneOnOne);
  } catch (error) {
    console.error(`PUT /api/one-on-ones/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await OneOnOneService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/one-on-ones/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
