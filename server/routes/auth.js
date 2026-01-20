import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import UserService from '../services/UserService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'pe-manager-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      });
    }

    // Find user by username
    const user = await UserService.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password'
      });
    }

    // Validate password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password'
      });
    }

    // Update last login
    await UserService.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return token and user info (without password)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get the authenticated user's information
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
});

/**
 * PUT /api/auth/change-password
 * Change the authenticated user's password
 */
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 6 characters long'
      });
    }

    await UserService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);

    if (error.message === 'Current password is incorrect') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (JWT is stateless, so this is mainly for frontend coordination)
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/auth/setup
 * Create initial admin user (only works if no users exist)
 */
router.post('/setup', async (req, res) => {
  try {
    const password = req.body.password || process.env.INITIAL_ADMIN_PASSWORD || 'changeme123';

    const admin = await UserService.createInitialAdmin(password);

    if (!admin) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Users already exist. Initial setup has already been completed.'
      });
    }

    res.status(201).json({
      message: 'Initial admin user created successfully',
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create initial admin user'
    });
  }
});

export default router;
