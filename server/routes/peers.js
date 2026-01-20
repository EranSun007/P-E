import { Router } from 'express';
import PeerService from '../services/PeerService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/peers - List all peers
router.get('/', async (req, res) => {
  try {
    const peers = await PeerService.list(req.user.id);
    res.json(peers);
  } catch (error) {
    console.error('GET /api/peers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/peers/:id - Get single peer
router.get('/:id', async (req, res) => {
  try {
    const peer = await PeerService.get(req.user.id, req.params.id);
    if (!peer) {
      return res.status(404).json({ error: 'Peer not found' });
    }
    res.json(peer);
  } catch (error) {
    console.error('GET /api/peers/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/peers - Create new peer
router.post('/', async (req, res) => {
  try {
    const peer = await PeerService.create(req.user.id, req.body);
    res.status(201).json(peer);
  } catch (error) {
    console.error('POST /api/peers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/peers/:id - Update peer
router.put('/:id', async (req, res) => {
  try {
    const peer = await PeerService.update(req.user.id, req.params.id, req.body);
    if (!peer) {
      return res.status(404).json({ error: 'Peer not found' });
    }
    res.json(peer);
  } catch (error) {
    console.error('PUT /api/peers/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/peers/:id - Delete peer
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PeerService.delete(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Peer not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('DELETE /api/peers/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
