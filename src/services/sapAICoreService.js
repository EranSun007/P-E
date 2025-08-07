import { 
  taskExtractionSchema, 
  projectAnalysisSchema, 
  aiResponseSchema,
  aiHealthSchema,
  aiModelSchema
} from '../schemas/aiSchemas.js';
import { 
  AIServiceError, 
  AIAuthenticationError, 
  AIRateLimitError, 
  AIModelUnavailableError, 
  AIValidationError, 
  AITimeoutError,
  executeAIOperation
} from '../utils/aiErrorHandling.js';

/**
 * SAP AI Core Service
 * Handles integration with SAP AI Core for LLM operations
 */
class SAPAICoreService {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      baseURL: config.baseURL || import.meta.env.VITE_SAP_AI_CORE_API_URL || '',
      clientId: config.clientId || import.meta.env.VITE_SAP_AI_CORE_CLIENT_ID || '',
      clientSecret: config.clientSecret || import.meta.env.VITE_SAP_AI_CORE_CLIENT_SECRET || '',
      authURL: config.authURL || import.meta.env.VITE_SAP_AI_CORE_AUTH_URL || '',
      resourceGroup: config.resourceGroup || import.meta.env.VITE_SAP_AI_CORE_RESOURCE_GROUP || 'default',
      defaultModel: config.defaultModel || 'meta--llama3.1-70b-instruct',
      timeout: config.timeout || 30000, // 30 seconds
      maxRetries: config.maxRetries || 3,
      enableCaching: config.enableCaching !== false,
      cacheTimeout: config.cacheTimeout || 3600000, // 1 hour in milliseconds
      ...config
    };

    // Initialize cache
    this.cache = new Map();
    this.modelCache = new Map();
    this.healthCache = null;
    this.healthCacheExpiry = null;
    
    // OAuth token management
    this.accessToken = null;
    this.tokenExpiry = null;

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate service configuration
   */
  validateConfig() {
    if (!this.config.baseURL) {
      throw new AIServiceError('SAP AI Core base URL is required', 'CONFIG_ERROR');
    }
    if (!this.config.clientId) {
      throw new AIServiceError('SAP AI Core client ID is required', 'CONFIG_ERROR');
    }
    if (!this.config.clientSecret) {
      throw new AIServiceError('SAP AI Core client secret is required', 'CONFIG_ERROR');
    }
    if (!this.config.authURL) {
      throw new AIServiceError('SAP AI Core auth URL is required', 'CONFIG_ERROR');
    }
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `${this.config.authURL}/oauth/token`;
      const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);

      console.log('Requesting OAuth token from:', tokenUrl);
      console.log('Client ID:', this.config.clientId);
      console.log('Auth URL:', this.config.authURL);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: 'grant_type=client_credentials'
      });

      console.log('OAuth response status:', response.status);
      console.log('OAuth response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth error response:', errorText);
        throw new AIAuthenticationError(`OAuth token request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('OAuth token received:', { 
        access_token: tokenData.access_token ? '[RECEIVED]' : '[MISSING]',
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type 
      });

      this.accessToken = tokenData.access_token;
      
      // Set expiry with 5 minute buffer
      const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
      this.tokenExpiry = Date.now() + (expiresIn - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('OAuth token request failed:', error);
      if (error instanceof AIAuthenticationError) {
        throw error;
      }
      throw new AIAuthenticationError(`Failed to obtain OAuth token: ${error.message}`);
    }
  }

  /**
   * Get authentication headers for SAP AI Core
   */
  async getAuthHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'AI-Resource-Group': this.config.resourceGroup
    };
  }

  /**
   * Make HTTP request to SAP AI Core
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.config.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const authHeaders = await this.getAuthHeaders();
      const requestOptions = {
        method: options.method || 'POST',
        headers: {
          ...authHeaders,
          ...options.headers
        },
        signal: controller.signal
      };

      // Only add body for non-GET requests
      if (options.body && requestOptions.method !== 'GET') {
        requestOptions.body = JSON.stringify(options.body);
      }

      console.log('Making request to:', url);
      console.log('Request options:', { ...requestOptions, headers: { ...requestOptions.headers, Authorization: '[REDACTED]' } });

      const response = await fetch(url, requestOptions);

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Handle different response status codes
      if (response.status === 401) {
        // Clear cached token on auth failure
        this.accessToken = null;
        this.tokenExpiry = null;
        throw new AIAuthenticationError('Invalid API key or authentication failed');
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
        throw new AIRateLimitError('Rate limit exceeded', { retryAfter });
      }

      if (response.status === 404) {
        throw new AIModelUnavailableError(
          options.model || this.config.defaultModel,
          'Model endpoint not found'
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new AIServiceError(
          `SAP AI Core request failed: ${response.status} ${response.statusText}`,
          'REQUEST_FAILED',
          { status: response.status, response: errorText }
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new AITimeoutError('Request timed out');
      }

      if (error instanceof AIServiceError) {
        throw error;
      }

      // Network or other errors
      console.error('Network error:', error);
      throw new AIServiceError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Generate cache key for requests
   */
  getCacheKey(prompt, model, options = {}) {
    const key = JSON.stringify({ prompt, model, options });
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(cacheKey) {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return { ...cached.data, cached: true };
    }

    // Clean up expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache response
   */
  setCachedResponse(cacheKey, data) {
    if (!this.config.enableCaching) return;

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 20);
      oldestKeys.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Invoke AI model with prompt and schema validation
   */
  async invokeModel(prompt, schema, options = {}) {
    const model = options.model || this.config.defaultModel;
    const cacheKey = this.getCacheKey(prompt, model, options);

    return executeAIOperation(async () => {
      // Check cache first
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      const startTime = Date.now();

      // Get deployment ID for the model
      const deploymentId = await this.getModelDeploymentId(model);
      
      // Prepare request body for SAP AI Core (using completions format that works)
      const requestBody = {
        prompt: prompt,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.1
      };

      // Make request to SAP AI Core inference endpoint
      const response = await this.makeRequest(`/v2/inference/deployments/${deploymentId}/completions`, {
        method: 'POST',
        body: requestBody,
        model
      });

      const responseTime = Date.now() - startTime;

      // Extract content from response
      let content;
      try {
        // Handle different response formats
        let responseText = '';
        if (response.choices && response.choices[0]) {
          responseText = response.choices[0].text || response.choices[0].message?.content || '';
        } else if (response.generated_text) {
          responseText = response.generated_text;
        } else if (response.text) {
          responseText = response.text;
        } else if (typeof response === 'string') {
          responseText = response;
        }

        if (!responseText) {
          throw new AIServiceError('Empty response from AI model', 'EMPTY_RESPONSE');
        }

        // Try to extract JSON from the response
        let parsedContent;
        try {
          // Look for JSON in the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedContent = JSON.parse(jsonMatch[0]);
          } else {
            // If no JSON found, return the text as is
            parsedContent = { text: responseText };
          }
        } catch (parseError) {
          // If JSON parsing fails, return the text
          parsedContent = { text: responseText };
        }

        // Validate response against schema if provided
        if (schema) {
          const validation = schema.safeParse(parsedContent);
          if (!validation.success) {
            throw new AIValidationError('Response validation failed', {
              errors: validation.error.issues,
              response: parsedContent
            });
          }
          content = validation.data;
        } else {
          content = parsedContent;
        }
      } catch (error) {
        if (error instanceof AIValidationError) {
          throw error;
        }
        throw new AIValidationError('Failed to parse AI response', {
          originalError: error.message,
          response: content
        });
      }

      const result = {
        success: true,
        data: content,
        model,
        tokens: response.usage?.total_tokens || 0,
        responseTime,
        cached: false
      };

      // Cache the response
      this.setCachedResponse(cacheKey, result);

      return result;
    }, {
      context: { operation: 'invokeModel', model, prompt: prompt.substring(0, 100) }
    });
  }

  /**
   * Get deployment ID for a specific model
   */
  async getModelDeploymentId(modelName) {
    try {
      const modelsResponse = await this.getAvailableModels();
      const models = modelsResponse.success ? modelsResponse.data : [];
      
      // Find the deployment for the requested model
      const model = models.find(m => 
        m.name.toLowerCase().includes(modelName.toLowerCase()) || 
        m.id.toLowerCase().includes(modelName.toLowerCase())
      );
      
      if (!model) {
        // Fallback: use the first available model
        const availableModel = models.find(m => m.isAvailable);
        if (availableModel) {
          console.warn(`Model ${modelName} not found, using ${availableModel.name} instead`);
          return availableModel.id;
        }
        throw new AIModelUnavailableError(modelName, 'No available models found');
      }
      
      if (!model.isAvailable) {
        throw new AIModelUnavailableError(modelName, 'Model is not currently available');
      }
      
      return model.id;
    } catch (error) {
      if (error instanceof AIModelUnavailableError) {
        throw error;
      }
      throw new AIServiceError(`Failed to get deployment ID for model ${modelName}: ${error.message}`);
    }
  }

  /**
   * Extract structured task information from natural language
   */
  async extractTaskFromNaturalLanguage(input) {
    const prompt = `
Extract structured task information from this natural language input: "${input}"

Please analyze the text and extract:
1. Task title (clear, actionable)
2. Description (if provided or can be inferred)
3. Task type: meeting, metric, action, or generic
4. Priority: low, medium, high, or urgent
5. Due date (if mentioned, in ISO format)
6. Stakeholders (people mentioned)
7. Tags (relevant categories or keywords)
8. Whether it's strategic (true/false)
9. Type-specific metadata:
   - For meetings: participants, agenda items, location
   - For metrics: KPI name, current/target values
   - For actions: expected outcome, dependencies

Return the response as a JSON object matching the expected schema.
If information is not explicitly provided, use reasonable defaults or leave optional fields empty.
    `.trim();

    return this.invokeModel(prompt, taskExtractionSchema, {
      temperature: 0.2,
      maxTokens: 2000
    });
  }

  /**
   * Analyze project for risks and recommendations
   */
  async analyzeProject(projectData) {
    const prompt = `
Analyze this project for risks, timeline predictions, and recommendations:

Project Details:
- Name: ${projectData.name || 'Unknown'}
- Description: ${projectData.description || 'No description provided'}
- Budget: ${projectData.budget || 'Not specified'}
- Deadline: ${projectData.deadline || 'Not specified'}
- Team Size: ${projectData.team?.length || 0} members
- Status: ${projectData.status || 'Unknown'}
- Tasks: ${projectData.tasks?.length || 0} tasks
- Completed Tasks: ${projectData.tasks?.filter(t => t.status === 'done')?.length || 0}

Please provide:
1. Risk Score (0-100)
2. Risk Level (low, medium, high, critical)
3. Key Risks with category, description, impact, and probability
4. Actionable recommendations with priority and rationale
5. Timeline predictions with confidence level
6. Resource analysis and recommendations
7. Executive summary

Focus on practical, actionable insights based on the project data provided.
    `.trim();

    return this.invokeModel(prompt, projectAnalysisSchema, {
      temperature: 0.3,
      maxTokens: 3000
    });
  }

  /**
   * Get available AI models from SAP AI Core
   */
  async getAvailableModels() {
    const cacheKey = 'available_models';
    const cached = this.modelCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached.data;
    }

    return executeAIOperation(async () => {
      const response = await this.makeRequest('/v2/lm/deployments', {
        method: 'GET'
      });

      const models = response.resources?.map(deployment => ({
        id: deployment.id,
        name: deployment.details?.resources?.backend_details?.model?.name || deployment.id,
        description: deployment.description || '',
        capabilities: ['text-generation', 'json-response'],
        isAvailable: deployment.status === 'RUNNING'
      })) || [];

      // Validate models
      const validatedModels = models.map(model => {
        const validation = aiModelSchema.safeParse(model);
        return validation.success ? validation.data : null;
      }).filter(Boolean);

      const result = {
        success: true,
        data: validatedModels
      };

      // Cache the result
      this.modelCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    }, {
      context: { operation: 'getAvailableModels' }
    });
  }

  /**
   * Check service health
   */
  async checkHealth() {
    // Return cached health if recent
    if (this.healthCache && this.healthCacheExpiry && Date.now() < this.healthCacheExpiry) {
      return this.healthCache;
    }

    return executeAIOperation(async () => {
      try {
        const modelsResponse = await this.getAvailableModels();
        const models = modelsResponse.success ? modelsResponse.data : [];

        const health = {
          status: 'healthy',
          models: models.map(model => ({
            id: model.id,
            status: model.isAvailable ? 'available' : 'unavailable',
            lastChecked: new Date().toISOString()
          })),
          lastUpdated: new Date().toISOString()
        };

        // Determine overall health
        const availableModels = models.filter(m => m.isAvailable);
        if (availableModels.length === 0) {
          health.status = 'unhealthy';
        } else if (availableModels.length < models.length * 0.8) {
          health.status = 'degraded';
        }

        const validation = aiHealthSchema.safeParse(health);
        const result = {
          success: true,
          data: validation.success ? validation.data : health
        };

        // Cache for 2 minutes
        this.healthCache = result;
        this.healthCacheExpiry = Date.now() + 120000;

        return result;
      } catch (error) {
        const result = {
          success: false,
          data: {
            status: 'unhealthy',
            models: [],
            lastUpdated: new Date().toISOString()
          },
          error: error.message
        };

        // Cache failed health check for 30 seconds
        this.healthCache = result;
        this.healthCacheExpiry = Date.now() + 30000;

        return result;
      }
    }, {
      context: { operation: 'checkHealth' }
    });
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear();
    this.modelCache.clear();
    this.healthCache = null;
    this.healthCacheExpiry = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      responseCache: {
        size: this.cache.size,
        enabled: this.config.enableCaching
      },
      modelCache: {
        size: this.modelCache.size
      },
      healthCached: !!this.healthCache
    };
  }
}

// Create and export default instance
const sapAICoreService = new SAPAICoreService();

export default sapAICoreService;
export { SAPAICoreService };
