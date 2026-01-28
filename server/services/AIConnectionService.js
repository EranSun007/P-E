/**
 * AI Connection Service
 * Handles connection to SAP AI Core via VCAP_SERVICES or environment variables
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

class AIConnectionService {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  /**
   * Get AI Core configuration from VCAP_SERVICES or environment
   * @returns {Object} AI Core configuration
   */
  getConfig() {
    if (this.config) {
      return this.config;
    }

    // Try VCAP_SERVICES first (BTP deployment)
    if (process.env.VCAP_SERVICES) {
      try {
        const vcapServices = JSON.parse(process.env.VCAP_SERVICES);

        // Look for aicore service binding
        const aiCoreService = vcapServices['aicore'] && vcapServices['aicore'][0];

        if (aiCoreService) {
          const credentials = aiCoreService.credentials;
          this.config = {
            clientId: credentials.clientid,
            clientSecret: credentials.clientsecret,
            tokenUrl: credentials.url + '/oauth/token',
            apiUrl: credentials.serviceurls?.AI_API_URL,
            deploymentId: process.env.AI_DEPLOYMENT_ID,
            resourceGroup: process.env.AI_RESOURCE_GROUP || 'default'
          };
          console.log('✅ AI Core configuration loaded from VCAP_SERVICES');
          return this.config;
        }
      } catch (error) {
        console.warn('Failed to parse VCAP_SERVICES for AI Core:', error.message);
      }
    }

    // Try AICORE_SERVICE_KEY environment variable (local development)
    if (process.env.AICORE_SERVICE_KEY) {
      try {
        const serviceKey = JSON.parse(process.env.AICORE_SERVICE_KEY);
        this.config = {
          clientId: serviceKey.clientid,
          clientSecret: serviceKey.clientsecret,
          tokenUrl: serviceKey.url + '/oauth/token',
          apiUrl: serviceKey.serviceurls?.AI_API_URL,
          deploymentId: process.env.AI_DEPLOYMENT_ID,
          resourceGroup: process.env.AI_RESOURCE_GROUP || 'default'
        };
        console.log('✅ AI Core configuration loaded from AICORE_SERVICE_KEY');
        return this.config;
      } catch (error) {
        console.warn('Failed to parse AICORE_SERVICE_KEY:', error.message);
      }
    }

    // Return null if no configuration found
    console.warn('⚠️ No AI Core configuration found. AI features will be disabled.');
    return null;
  }

  /**
   * Check if AI Core is configured and available
   * @returns {boolean}
   */
  isAvailable() {
    return this.getConfig() !== null;
  }

  /**
   * Get deployment configuration for SAP AI SDK
   * @returns {Object|null} Deployment configuration
   */
  getDeploymentConfig() {
    const config = this.getConfig();
    if (!config) {
      return null;
    }

    return {
      resourceGroup: config.resourceGroup,
      deploymentId: config.deploymentId
    };
  }

  /**
   * Get the model name from environment or default
   * @returns {string}
   */
  getModelName() {
    return process.env.AI_MODEL_NAME || 'anthropic--claude-3.5-sonnet';
  }

  /**
   * Get model parameters
   * @returns {Object}
   */
  getModelParams() {
    return {
      max_tokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7')
    };
  }
}

export default new AIConnectionService();
