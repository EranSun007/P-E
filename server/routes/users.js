import express from 'express';
import UserService from '../services/UserService.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', async (req, res) => {
  try {
    const users = await UserService.list(req.user.id);
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list users'
    });
  }
});

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post('/', async (req, res) => {
  try {
    const { username, password, email, name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await UserService.create(req.user.id, {
      username,
      password,
      email,
      name,
      role: role || 'user'
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message === 'Username already exists') {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message
      });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
});

/**
 * GET /api/users/:id
 * Get a specific user (admin only)
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await UserService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    const { email, name, role, is_active } = req.body;

    const user = await UserService.update(req.user.id, req.params.id, {
      email,
      name,
      role,
      is_active
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Deactivate a user (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    await UserService.deactivate(req.user.id, req.params.id);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    if (error.message === 'Cannot deactivate your own account') {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to deactivate user'
    });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset a user's password (admin only)
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 6 characters long'
      });
    }

    await UserService.resetPassword(req.user.id, req.params.id, newPassword);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
});

export default router;
