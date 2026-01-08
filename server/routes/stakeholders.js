import express from 'express';
import StakeholderService from '../services/StakeholderService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const stakeholders = await StakeholderService.list(req.user.id);
    res.json(stakeholders);
  } catch (error) {
    console.error('GET /api/stakeholders error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const stakeholder = await StakeholderService.create(req.user.id, req.body);
    res.status(201).json(stakeholder);
  } catch (error) {
    console.error('POST /api/stakeholders error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const stakeholder = await StakeholderService.update(req.user.id, req.params.id, req.body);
    res.json(stakeholder);
  } catch (error) {
    console.error(`PUT /api/stakeholders/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await StakeholderService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/stakeholders/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
