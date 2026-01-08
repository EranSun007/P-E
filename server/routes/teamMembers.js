import express from 'express';
import TeamMemberService from '../services/TeamMemberService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const members = await TeamMemberService.list(req.user.id);
    res.json(members);
  } catch (error) {
    console.error('GET /api/team-members error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const member = await TeamMemberService.get(req.user.id, req.params.id);
    res.json(member);
  } catch (error) {
    console.error(`GET /api/team-members/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const member = await TeamMemberService.create(req.user.id, req.body);
    res.status(201).json(member);
  } catch (error) {
    console.error('POST /api/team-members error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const member = await TeamMemberService.update(req.user.id, req.params.id, req.body);
    res.json(member);
  } catch (error) {
    console.error(`PUT /api/team-members/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await TeamMemberService.delete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/team-members/${req.params.id} error:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
