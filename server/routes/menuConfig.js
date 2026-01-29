import express from 'express';
import MenuConfigService from '../services/MenuConfigService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const VALID_MODES = ['people', 'product'];

/**
 * Validate mode parameter
 */
function validateMode(mode) {
  return VALID_MODES.includes(mode);
}

/**
 * Validate config structure
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }
  if (!Array.isArray(config.folders) || !Array.isArray(config.items)) {
    return false;
  }
  return true;
}

// GET /api/menu-config/:mode - Get menu config for mode
router.get('/:mode', async (req, res) => {
  try {
    const { mode } = req.params;

    if (!validateMode(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        message: `Mode must be one of: ${VALID_MODES.join(', ')}`
      });
    }

    const config = await MenuConfigService.getConfig(req.user.id, mode);

    res.json({ mode, config });
  } catch (error) {
    console.error(`GET /api/menu-config/${req.params.mode} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu-config/:mode/defaults - Get default config for mode
router.get('/:mode/defaults', async (req, res) => {
  try {
    const { mode } = req.params;

    if (!validateMode(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        message: `Mode must be one of: ${VALID_MODES.join(', ')}`
      });
    }

    const config = MenuConfigService.getDefaults(mode);

    res.json({ mode, config });
  } catch (error) {
    console.error(`GET /api/menu-config/${req.params.mode}/defaults error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/menu-config/:mode - Save menu config for mode
router.put('/:mode', async (req, res) => {
  try {
    const { mode } = req.params;

    if (!validateMode(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        message: `Mode must be one of: ${VALID_MODES.join(', ')}`
      });
    }

    const config = req.body;

    if (!validateConfig(config)) {
      return res.status(400).json({
        error: 'Invalid config',
        message: 'Config must have folders (array) and items (array) properties'
      });
    }

    const savedConfig = await MenuConfigService.setConfig(req.user.id, mode, config);

    res.json({ mode, config: savedConfig, updated: true });
  } catch (error) {
    console.error(`PUT /api/menu-config/${req.params.mode} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
