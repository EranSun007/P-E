import jwt from 'jsonwebtoken';
import UserService from '../services/UserService.js';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'pe-manager-dev-secret-change-in-production';

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 *
 * Supports two modes:
 * 1. Development mode with DEV_SKIP_AUTH=true: Bypass authentication entirely
 * 2. Normal mode: Validate JWT token from Authorization header
 */
async function authMiddleware(req, res, next) {
  // Development bypass mode (only when explicitly enabled)
  if (process.env.DEV_SKIP_AUTH === 'true') {
    req.user = {
      id: process.env.DEV_USER_ID || 'dev-user-001',
      username: 'dev',
      name: process.env.DEV_USER_NAME || 'Development User',
      email: process.env.DEV_USER_EMAIL || 'dev@example.com',
      role: 'admin'
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      }
      throw jwtError;
    }

    // Look up user to verify they still exist and are active
    const user = await UserService.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account is deactivated'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  next();
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token, continue without user
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserService.findById(decoded.userId);

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      };
    }
  } catch {
    // Invalid token, continue without user
  }

  next();
}

export { authMiddleware, requireAdmin, optionalAuth };
