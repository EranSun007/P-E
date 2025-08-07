import { aiConfigSchema } from '../schemas/aiSchemas.js';
import sapAICoreService from './sapAICoreService.js';

/**
 * AI Model Configuration Service
 * Manages AI model selection, configuration, and user preferences
 */
class AIModelConfigService {
  constructor() {
    this.storageKey = 'ai_model_config';
    this.defaultConfig = {
      selectedModel: 'claude-4-sonnet',
      enableCaching: true,
      cacheTimeout: 3600, // seconds
      maxRetries: 3,
      timeout: 10000, // milliseconds
      enableFallback: true,
      fallbackModel: 'gpt-4'
    };
    
    // Load configuration from localStorage
    this.config = this.loadConfig();
    
    // Available model configurations
    this.modelConfigurations = {
      'claude-4-sonnet': {
        id: 'claude-4-sonnet',
        name: 'Claude 4 Sonnet',
        description: 'Most capable model for complex reasoning and analysis',
        capabilities: ['text-generation', 'json-response', 'analysis', 'reasoning'],
        maxTokens: 4096,
        responseTime: 'medium',
        costTier: 'premium',
        recommended: true
      },
      'claude-3-haiku': {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient model for simple tasks',
        capabilities: ['text-generation', 'json-response'],
        maxTokens: 4096,
        responseTime: 'fast',
        costTier: 'standard',
        recommended: false
      },
      'gpt-4': {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'OpenAI\'s most capable model',
        capabilities: ['text-generation', 'json-response', 'analysis'],
        maxTokens: 8192,
        responseTime: 'medium',
        costTier: 'premium',
        recommended: false
      },
      'gpt-3.5-turbo': {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective model',
        capabilities: ['text-generation', 'json-response'],
        maxTokens: 4096,
        responseTime: 'fast',
        costTier: 'standard',
        recommended: false
      }
    };
  }

  /**
   * Load configuration from localStorage
   */
  loadConfig() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validation = aiConfigSchema.safeParse(parsed);
        if (validation.success) {
          return { ...this.defaultConfig, ...validation.data };
        }
      }
    } catch (error) {
      console.warn('Failed to load AI config from localStorage:', error);
    }
    
    return { ...this.defaultConfig };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(config) {
    try {
      const validation = aiConfigSchema.safeParse(config);
      if (!validation.success) {
        throw new Error('Invalid configuration: ' + validation.error.message);
      }
      
      this.config = { ...this.config, ...validation.data };
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      
      // Update SAP AI Core service configuration
      this.updateServiceConfig();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save AI config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update SAP AI Core service with current configuration
   */
  updateServiceConfig() {
    if (sapAICoreService && sapAICoreService.config) {
      sapAICoreService.config.defaultModel = this.config.selectedModel;
      sapAICoreService.config.enableCaching = this.config.enableCaching;
      sapAICoreService.config.cacheTimeout = this.config.cacheTimeout * 1000; // Convert to milliseconds
      sapAICoreService.config.maxRetries = this.config.maxRetries;
      sapAICoreService.config.timeout = this.config.timeout;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get available models with their configurations
   */
  async getAvailableModels() {
    try {
      // Get models from SAP AI Core
      const response = await sapAICoreService.getAvailableModels();
      
      if (response.success) {
        // Merge with local model configurations
        const availableModels = response.data.map(model => ({
          ...model,
          ...(this.modelConfigurations[model.id] || {}),
          isDeployed: true
        }));

        // Add local configurations for models that might not be deployed yet
        Object.values(this.modelConfigurations).forEach(localModel => {
          if (!availableModels.find(m => m.id === localModel.id)) {
            availableModels.push({
              ...localModel,
              isAvailable: false,
              isDeployed: false
            });
          }
        });

        return {
          success: true,
          data: availableModels.sort((a, b) => {
            // Sort by: recommended first, then available, then by name
            if (a.recommended && !b.recommended) return -1;
            if (!a.recommended && b.recommended) return 1;
            if (a.isAvailable && !b.isAvailable) return -1;
            if (!a.isAvailable && b.isAvailable) return 1;
            return a.name.localeCompare(b.name);
          })
        };
      } else {
        // Fallback to local configurations if service is unavailable
        return {
          success: true,
          data: Object.values(this.modelConfigurations).map(model => ({
            ...model,
            isAvailable: false,
            isDeployed: false
          })),
          fallback: true
        };
      }
    } catch (error) {
      console.error('Failed to get available models:', error);
      return {
        success: false,
        error: error.message,
        data: Object.values(this.modelConfigurations).map(model => ({
          ...model,
          isAvailable: false,
          isDeployed: false
        }))
      };
    }
  }

  /**
   * Set selected model
   */
  async setSelectedModel(modelId) {
    // Validate that the model exists
    const modelsResponse = await this.getAvailableModels();
    const availableModels = modelsResponse.data || [];
    const selectedModel = availableModels.find(m => m.id === modelId);
    
    if (!selectedModel) {
      return {
        success: false,
        error: `Model ${modelId} is not available`
      };
    }

    if (!selectedModel.isAvailable) {
      return {
        success: false,
        error: `Model ${modelId} is currently unavailable`
      };
    }

    // Update configuration
    const result = this.saveConfig({
      ...this.config,
      selectedModel: modelId
    });

    if (result.success) {
      return {
        success: true,
        data: {
          selectedModel: modelId,
          modelInfo: selectedModel
        }
      };
    }

    return result;
  }

  /**
   * Get selected model information
   */
  async getSelectedModel() {
    const modelsResponse = await this.getAvailableModels();
    const availableModels = modelsResponse.data || [];
    const selectedModel = availableModels.find(m => m.id === this.config.selectedModel);

    return {
      success: true,
      data: {
        selectedModelId: this.config.selectedModel,
        modelInfo: selectedModel || null,
        isAvailable: selectedModel?.isAvailable || false
      }
    };
  }

  /**
   * Get fallback model
   */
  async getFallbackModel() {
    if (!this.config.enableFallback || !this.config.fallbackModel) {
      return { success: false, error: 'Fallback is disabled' };
    }

    const modelsResponse = await this.getAvailableModels();
    const availableModels = modelsResponse.data || [];
    const fallbackModel = availableModels.find(m => 
      m.id === this.config.fallbackModel && m.isAvailable
    );

    if (!fallbackModel) {
      // Try to find any available model as fallback
      const anyAvailable = availableModels.find(m => m.isAvailable);
      if (anyAvailable) {
        return {
          success: true,
          data: {
            modelId: anyAvailable.id,
            modelInfo: anyAvailable,
            isAutoSelected: true
          }
        };
      }
      
      return { success: false, error: 'No fallback model available' };
    }

    return {
      success: true,
      data: {
        modelId: fallbackModel.id,
        modelInfo: fallbackModel,
        isAutoSelected: false
      }
    };
  }

  /**
   * Update specific configuration setting
   */
  updateSetting(key, value) {
    if (!(key in this.defaultConfig)) {
      return {
        success: false,
        error: `Unknown setting: ${key}`
      };
    }

    return this.saveConfig({
      ...this.config,
      [key]: value
    });
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    this.config = { ...this.defaultConfig };
    localStorage.removeItem(this.storageKey);
    this.updateServiceConfig();
    
    return {
      success: true,
      data: this.config
    };
  }

  /**
   * Get model performance metrics (if available)
   */
  async getModelMetrics(modelId) {
    // This would typically come from monitoring/analytics
    // For now, return mock data based on model characteristics
    const model = this.modelConfigurations[modelId];
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    // Mock metrics based on model characteristics
    const metrics = {
      averageResponseTime: model.responseTime === 'fast' ? 1200 : 
                          model.responseTime === 'medium' ? 2500 : 4000,
      successRate: 0.95,
      averageTokens: model.maxTokens * 0.6,
      costPerRequest: model.costTier === 'premium' ? 0.03 : 0.01,
      lastUpdated: new Date().toISOString()
    };

    return {
      success: true,
      data: metrics
    };
  }

  /**
   * Test model availability and response
   */
  async testModel(modelId) {
    try {
      const testPrompt = 'Respond with a simple JSON object: {"status": "ok", "model": "' + modelId + '"}';
      
      const response = await sapAICoreService.invokeModel(testPrompt, null, {
        model: modelId,
        maxTokens: 100,
        temperature: 0
      });

      return {
        success: response.success,
        data: {
          modelId,
          responseTime: response.responseTime,
          tokens: response.tokens,
          testPassed: response.success
        },
        error: response.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          modelId,
          testPassed: false
        }
      };
    }
  }

  /**
   * Get configuration export for backup
   */
  exportConfig() {
    return {
      config: this.config,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import configuration from backup
   */
  importConfig(exportedConfig) {
    try {
      if (!exportedConfig.config) {
        throw new Error('Invalid export format');
      }

      const result = this.saveConfig(exportedConfig.config);
      if (result.success) {
        return {
          success: true,
          data: this.config
        };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create and export default instance
const aiModelConfigService = new AIModelConfigService();

export default aiModelConfigService;
export { AIModelConfigService };
