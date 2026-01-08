import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/auth/me
 * Get the authenticated user's information
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email
  });
});

/**
 * POST /api/auth/logout
 * Logout endpoint (mainly for frontend to clear token)
 */
router.post('/logout', (req, res) => {
  // In JWT-based auth, logout is handled client-side by deleting the token
  // For XSUAA, redirect to XSUAA logout endpoint
  res.json({ message: 'Logged out successfully' });
});

export default router;
