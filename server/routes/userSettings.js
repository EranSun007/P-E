import express from 'express';
import UserSettingsService from '../services/UserSettingsService.js';
import GitHubService from '../services/GitHubService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Get GitHub connection status
router.get('/github/status', async (req, res) => {
  try {
    const hasToken = await UserSettingsService.hasGitHubToken(req.user.id);

    if (!hasToken) {
      return res.json({
        connected: false,
        message: 'GitHub token not configured'
      });
    }

    // Validate the token
    const validation = await GitHubService.validateToken(req.user.id);

    res.json({
      connected: validation.valid,
      user: validation.valid ? {
        login: validation.login,
        name: validation.name,
        avatar_url: validation.avatar_url
      } : null,
      error: validation.error || null
    });
  } catch (error) {
    console.error('GET /api/user-settings/github/status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set GitHub token
router.post('/github/token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Store the token first (temporarily)
    await UserSettingsService.setGitHubToken(req.user.id, token);

    // Validate it
    const validation = await GitHubService.validateToken(req.user.id);

    if (!validation.valid) {
      // Remove invalid token
      await UserSettingsService.deleteGitHubToken(req.user.id);
      return res.status(400).json({
        error: 'Invalid GitHub token',
        details: validation.error
      });
    }

    res.json({
      success: true,
      user: {
        login: validation.login,
        name: validation.name,
        avatar_url: validation.avatar_url
      }
    });
  } catch (error) {
    console.error('POST /api/user-settings/github/token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete GitHub token (disconnect)
router.delete('/github/token', async (req, res) => {
  try {
    await UserSettingsService.deleteGitHubToken(req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user-settings/github/token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific setting
router.get('/:key', async (req, res) => {
  try {
    const value = await UserSettingsService.get(req.user.id, req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error(`GET /api/user-settings/${req.params.key} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Set a setting
router.put('/:key', async (req, res) => {
  try {
    const { value, encrypted } = req.body;
    const result = await UserSettingsService.set(
      req.user.id,
      req.params.key,
      value,
      encrypted || false
    );
    res.json(result);
  } catch (error) {
    console.error(`PUT /api/user-settings/${req.params.key} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a setting
router.delete('/:key', async (req, res) => {
  try {
    await UserSettingsService.delete(req.user.id, req.params.key);
    res.status(204).send();
  } catch (error) {
    console.error(`DELETE /api/user-settings/${req.params.key} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
