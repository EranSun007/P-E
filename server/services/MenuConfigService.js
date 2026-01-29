import UserSettingsService from './UserSettingsService.js';

// Default menu configurations for each mode
// folders: array of { id: string, name: string, order: number }
// items: array of { itemId: string, folderId: string|null, order: number }
// (itemId matches navigation item name like "Tasks", "Calendar", etc.)
// (folderId is null for root-level items)

const DEFAULT_PEOPLE_CONFIG = {
  folders: [],
  items: []
};

const DEFAULT_PRODUCT_CONFIG = {
  folders: [],
  items: []
};

class MenuConfigService {
  /**
   * Get menu configuration for a user and mode
   * @param {string} userId - User ID
   * @param {'people' | 'product'} mode - Menu mode
   * @returns {Promise<{folders: Array, items: Array}>} Menu configuration
   */
  async getConfig(userId, mode) {
    const settingKey = `menu_config_${mode}`;
    const defaultConfig = mode === 'people' ? DEFAULT_PEOPLE_CONFIG : DEFAULT_PRODUCT_CONFIG;

    try {
      const value = await UserSettingsService.get(userId, settingKey);

      if (!value) {
        return defaultConfig;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error(`MenuConfigService.getConfig error for user ${userId}, mode ${mode}:`, error);
      return defaultConfig;
    }
  }

  /**
   * Save menu configuration for a user and mode
   * @param {string} userId - User ID
   * @param {'people' | 'product'} mode - Menu mode
   * @param {{folders: Array, items: Array}} config - Menu configuration
   * @returns {Promise<{folders: Array, items: Array}>} Saved configuration
   */
  async setConfig(userId, mode, config) {
    const settingKey = `menu_config_${mode}`;
    const jsonString = JSON.stringify(config);

    await UserSettingsService.set(userId, settingKey, jsonString, false);

    return config;
  }

  /**
   * Get default configuration for a mode (synchronous)
   * @param {'people' | 'product'} mode - Menu mode
   * @returns {{folders: Array, items: Array}} Default configuration
   */
  getDefaults(mode) {
    return mode === 'people' ? DEFAULT_PEOPLE_CONFIG : DEFAULT_PRODUCT_CONFIG;
  }
}

export default new MenuConfigService();
