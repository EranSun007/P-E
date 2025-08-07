#!/usr/bin/env node

/**
 * AI Integration Test Script (Node.js Compatible)
 * Tests SAP AI Core integration without UI dependencies
 */

import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Import schemas directly since we need them
const taskExtractionSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  type: z.enum(['meeting', 'metric', 'action', 'generic']).default('generic'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
  stakeholders: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  strategic: z.boolean().default(false),
  metadata: z.object({
    meeting: z.object({
      participants: z.array(z.string()).default([]),
      agenda: z.array(z.string()).default([]),
      location: z.string().optional()
    }).optional(),
    metric: z.object({
      kpi_name: z.string().optional(),
      current_value: z.string().optional(),
      target_value: z.string().optional(),
      measurement_frequency: z.string().optional()
    }).optional(),
    action: z.object({
      outcome: z.string().optional(),
      dependencies: z.array(z.string()).default([])
    }).optional()
  }).optional()
});

const projectAnalysisSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  keyRisks: z.array(z.object({
    category: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
    probability: z.enum(['low', 'medium', 'high']),
    mitigation: z.string().optional()
  })),
  recommendations: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high']),
    action: z.string(),
    rationale: z.string(),
    estimatedImpact: z.string(),
    timeframe: z.string().optional()
  })),
  timelinePredictions: z.object({
    estimatedCompletion: z.string(),
    confidenceLevel: z.number().min(0).max(100),
    potentialDelays: z.array(z.string()),
    criticalPath: z.array(z.string()).optional()
  }),
  resourceAnalysis: z.object({
    currentUtilization: z.number().min(0).max(100).optional(),
    recommendedAdjustments: z.array(z.string()).default([]),
    skillGaps: z.array(z.string()).default([])
  }).optional(),
  summary: z.string()
});

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  verbose: true
};

// Test data
const TEST_TASK_INPUT = "Schedule a high priority meeting with John and Sarah next Friday to discuss the Q1 budget review and project timeline adjustments";

const TEST_PROJECT_DATA = {
  name: "Customer Portal Redesign",
  description: "Complete redesign of customer portal with new UI/UX and enhanced functionality",
  budget: 150000,
  deadline: "2024-03-15",
  team: [
    { id: "1", name: "Alice Johnson", role: "Frontend Developer" },
    { id: "2", name: "Bob Smith", role: "Backend Developer" },
    { id: "3", name: "Carol Davis", role: "UX Designer" }
  ],
  status: "active",
  tasks: [
    { id: "1", title: "User Research", status: "done" },
    { id: "2", title: "Wireframe Creation", status: "done" },
    { id: "3", title: "UI Design", status: "in-progress" },
    { id: "4", title: "Frontend Development", status: "todo" },
    { id: "5", title: "Backend API", status: "todo" },
    { id: "6", title: "Testing", status: "todo" }
  ]
};

class NodeAIService {
  constructor(config = {}) {
    // Configuration with Node.js environment variables
    this.config = {
      baseURL: config.baseURL || process.env.VITE_SAP_AI_CORE_API_URL || '',
      clientId: config.clientId || process.env.VITE_SAP_AI_CORE_CLIENT_ID || '',
      clientSecret: config.clientSecret || process.env.VITE_SAP_AI_CORE_CLIENT_SECRET || '',
      authURL: config.authURL || process.env.VITE_SAP_AI_CORE_AUTH_URL || '',
      resourceGroup: config.resourceGroup || process.env.VITE_SAP_AI_CORE_RESOURCE_GROUP || 'default',
      defaultModel: config.defaultModel || 'claude-4-sonnet',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      enableCaching: config.enableCaching !== false,
      cacheTimeout: config.cacheTimeout || 3600000,
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

  validateConfig() {
    if (!this.config.baseURL) {
      throw new Error('SAP AI Core base URL is required');
    }
    if (!this.config.clientId) {
      throw new Error('SAP AI Core client ID is required');
    }
    if (!this.config.clientSecret) {
      throw new Error('SAP AI Core client secret is required');
    }
    if (!this.config.authURL) {
      throw new Error('SAP AI Core auth URL is required');
    }
  }

  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `${this.config.authURL}/oauth/token`;
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      console.log('Requesting OAuth token from:', tokenUrl);
      console.log('Client ID:', this.config.clientId);

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth error response:', errorText);
        throw new Error(`OAuth token request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('OAuth token received:', { 
        access_token: tokenData.access_token ? '[RECEIVED]' : '[MISSING]',
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type 
      });

      this.accessToken = tokenData.access_token;
      
      // Set expiry with 5 minute buffer
      const expiresIn = tokenData.expires_in || 3600;
      this.tokenExpiry = Date.now() + (expiresIn - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('OAuth token request failed:', error);
      throw new Error(`Failed to obtain OAuth token: ${error.message}`);
    }
  }

  async getAuthHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'AI-Resource-Group': this.config.resourceGroup
    };
  }

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

      if (options.body && requestOptions.method !== 'GET') {
        requestOptions.body = JSON.stringify(options.body);
      }

      console.log('Making request to:', url);

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (response.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
        throw new Error('Invalid API key or authentication failed');
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
        throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`SAP AI Core request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      throw error;
    }
  }

  async getAvailableModels() {
    try {
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

      return {
        success: true,
        data: models
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async checkHealth() {
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

      const availableModels = models.filter(m => m.isAvailable);
      if (availableModels.length === 0) {
        health.status = 'unhealthy';
      } else if (availableModels.length < models.length * 0.8) {
        health.status = 'degraded';
      }

      return {
        success: true,
        data: health
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'unhealthy',
          models: [],
          lastUpdated: new Date().toISOString()
        },
        error: error.message
      };
    }
  }

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

class AIIntegrationTester {
  constructor() {
    this.aiService = new NodeAIService();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, level = 'info') {
    if (!TEST_CONFIG.verbose && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = level.toUpperCase().padEnd(5);
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest(testName, testFn) {
    this.log(`\n🧪 Running test: ${testName}`, 'info');
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      this.log(`✅ PASSED: ${testName} (${duration}ms)`, 'info');
      
      this.results.passed++;
      this.results.tests.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ FAILED: ${testName} (${duration}ms)`, 'info');
      this.log(`   Error: ${error.message}`, 'info');
      
      if (TEST_CONFIG.verbose) {
        this.log(`   Stack: ${error.stack}`, 'debug');
      }
      
      this.results.failed++;
      this.results.tests.push({
        name: testName,
        status: 'FAILED',
        duration,
        error: error.message
      });
      
      throw error;
    }
  }

  async testConfiguration() {
    return this.runTest('Configuration Validation', async () => {
      const config = this.aiService.config;
      
      if (!config.baseURL) throw new Error('Missing base URL');
      if (!config.clientId) throw new Error('Missing client ID');
      if (!config.clientSecret) throw new Error('Missing client secret');
      if (!config.authURL) throw new Error('Missing auth URL');
      
      this.log(`   Base URL: ${config.baseURL}`, 'debug');
      this.log(`   Auth URL: ${config.authURL}`, 'debug');
      this.log(`   Resource Group: ${config.resourceGroup}`, 'debug');
      
      return { status: 'valid', config: config };
    });
  }

  async testAuthentication() {
    return this.runTest('OAuth Authentication', async () => {
      const token = await this.aiService.getAccessToken();
      
      if (!token) throw new Error('No access token received');
      if (typeof token !== 'string') throw new Error('Invalid token format');
      if (token.length < 10) throw new Error('Token too short');
      
      this.log(`   Token received: ${token.substring(0, 20)}...`, 'debug');
      
      return { status: 'authenticated', tokenLength: token.length };
    });
  }

  async testHealthCheck() {
    return this.runTest('Service Health Check', async () => {
      const health = await this.aiService.checkHealth();
      
      if (!health.success) {
        throw new Error(`Health check failed: ${health.error}`);
      }
      
      const healthData = health.data;
      this.log(`   Status: ${healthData.status}`, 'debug');
      this.log(`   Models: ${healthData.models.length}`, 'debug');
      
      return healthData;
    });
  }

  async testModelListing() {
    return this.runTest('Available Models', async () => {
      const modelsResponse = await this.aiService.getAvailableModels();
      
      if (!modelsResponse.success) {
        throw new Error(`Failed to get models: ${modelsResponse.error}`);
      }
      
      const models = modelsResponse.data;
      this.log(`   Found ${models.length} models`, 'debug');
      
      models.forEach(model => {
        this.log(`   - ${model.name} (${model.id}): ${model.isAvailable ? 'Available' : 'Unavailable'}`, 'debug');
      });
      
      return { total: models.length, available: models.filter(m => m.isAvailable).length, models };
    });
  }

  async testCacheStatistics() {
    return this.runTest('Cache Statistics', async () => {
      const stats = this.aiService.getCacheStats();
      
      this.log(`   Response cache size: ${stats.responseCache.size}`, 'debug');
      this.log(`   Model cache size: ${stats.modelCache.size}`, 'debug');
      this.log(`   Health cached: ${stats.healthCached}`, 'debug');
      
      return stats;
    });
  }

  async runAllTests() {
    this.log('🚀 Starting AI Integration Tests (Node.js Compatible)\n', 'info');
    
    const tests = [
      () => this.testConfiguration(),
      () => this.testAuthentication(),
      () => this.testHealthCheck(),
      () => this.testModelListing(),
      () => this.testCacheStatistics()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.log(`   Continuing with remaining tests...`, 'debug');
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    this.log('\n📊 Test Summary', 'info');
    this.log(`   Total Tests: ${this.results.passed + this.results.failed}`, 'info');
    this.log(`   Passed: ${this.results.passed}`, 'info');
    this.log(`   Failed: ${this.results.failed}`, 'info');
    
    if (this.results.failed > 0) {
      this.log('\n❌ Failed Tests:', 'info');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(test => {
          this.log(`   - ${test.name}: ${test.error}`, 'info');
        });
    }
    
    if (this.results.passed > 0) {
      this.log('\n✅ Passed Tests:', 'info');
      this.results.tests
        .filter(t => t.status === 'PASSED')
        .forEach(test => {
          this.log(`   - ${test.name} (${test.duration}ms)`, 'info');
        });
    }
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    this.log(`\n🎯 Success Rate: ${successRate}%`, 'info');
    
    if (this.results.failed === 0) {
      this.log('\n🎉 All tests passed! AI integration is working correctly.', 'info');
    } else {
      this.log('\n⚠️  Some tests failed. Check the configuration and network connectivity.', 'info');
    }
  }
}

// Run tests
const tester = new AIIntegrationTester();
tester.runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
