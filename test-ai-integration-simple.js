#!/usr/bin/env node

/**
 * Simple AI Integration Test Script
 * Tests SAP AI Core integration without external dependencies
 */

import { z } from 'zod';
import { readFileSync } from 'fs';

// Load environment variables from .env file manually
function loadEnvFile() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    // Set environment variables
    Object.assign(process.env, envVars);
    console.log('✅ Environment variables loaded from .env file');
  } catch (error) {
    console.log('⚠️  Could not load .env file, using existing environment variables');
  }
}

// Load environment variables
loadEnvFile();

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  verbose: true
};

class SimpleAIService {
  constructor() {
    this.config = {
      baseURL: process.env.VITE_SAP_AI_CORE_API_URL || '',
      clientId: process.env.VITE_SAP_AI_CORE_CLIENT_ID || '',
      clientSecret: process.env.VITE_SAP_AI_CORE_CLIENT_SECRET || '',
      authURL: process.env.VITE_SAP_AI_CORE_AUTH_URL || '',
      resourceGroup: process.env.VITE_SAP_AI_CORE_RESOURCE_GROUP || 'default',
      timeout: 30000
    };

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  validateConfig() {
    const missing = [];
    if (!this.config.baseURL) missing.push('VITE_SAP_AI_CORE_API_URL');
    if (!this.config.clientId) missing.push('VITE_SAP_AI_CORE_CLIENT_ID');
    if (!this.config.clientSecret) missing.push('VITE_SAP_AI_CORE_CLIENT_SECRET');
    if (!this.config.authURL) missing.push('VITE_SAP_AI_CORE_AUTH_URL');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `${this.config.authURL}/oauth/token`;
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth failed: ${response.status} - ${errorText}`);
      }

      const tokenData = await response.json();
      this.accessToken = tokenData.access_token;
      
      const expiresIn = tokenData.expires_in || 3600;
      this.tokenExpiry = Date.now() + (expiresIn - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.config.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const token = await this.getAccessToken();
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'AI-Resource-Group': this.config.resourceGroup,
          ...options.headers
        },
        signal: controller.signal
      };

      if (options.body && requestOptions.method !== 'GET') {
        requestOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
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
      const response = await this.makeRequest('/v2/lm/deployments');
      
      const models = response.resources?.map(deployment => ({
        id: deployment.id,
        name: deployment.details?.resources?.backend_details?.model?.name || deployment.id,
        status: deployment.status,
        isAvailable: deployment.status === 'RUNNING'
      })) || [];

      return { success: true, data: models };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  async checkHealth() {
    try {
      const modelsResponse = await this.getAvailableModels();
      const models = modelsResponse.success ? modelsResponse.data : [];

      const availableModels = models.filter(m => m.isAvailable);
      const status = availableModels.length === 0 ? 'unhealthy' : 
                   availableModels.length < models.length * 0.8 ? 'degraded' : 'healthy';

      return {
        success: true,
        data: {
          status,
          totalModels: models.length,
          availableModels: availableModels.length,
          models: models.map(m => ({
            id: m.id,
            name: m.name,
            status: m.isAvailable ? 'available' : 'unavailable'
          })),
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          status: 'unhealthy',
          totalModels: 0,
          availableModels: 0,
          models: [],
          lastUpdated: new Date().toISOString()
        }
      };
    }
  }
}

class AIIntegrationTester {
  constructor() {
    this.aiService = new SimpleAIService();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, level = 'info') {
    if (!TEST_CONFIG.verbose && level === 'debug') return;
    
    const timestamp = new Date().toISOString().substring(11, 19);
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
      const isValid = this.aiService.validateConfig();
      const config = this.aiService.config;
      
      this.log(`   Base URL: ${config.baseURL}`, 'debug');
      this.log(`   Auth URL: ${config.authURL}`, 'debug');
      this.log(`   Client ID: ${config.clientId.substring(0, 20)}...`, 'debug');
      this.log(`   Resource Group: ${config.resourceGroup}`, 'debug');
      
      return { status: 'valid', config: { ...config, clientSecret: '[HIDDEN]' } };
    });
  }

  async testAuthentication() {
    return this.runTest('OAuth Authentication', async () => {
      const token = await this.aiService.getAccessToken();
      
      if (!token || typeof token !== 'string' || token.length < 10) {
        throw new Error('Invalid or missing access token');
      }
      
      this.log(`   Token received: ${token.substring(0, 20)}...`, 'debug');
      this.log(`   Token length: ${token.length} characters`, 'debug');
      
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
      this.log(`   Total Models: ${healthData.totalModels}`, 'debug');
      this.log(`   Available Models: ${healthData.availableModels}`, 'debug');
      
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
      
      const availableModels = models.filter(m => m.isAvailable);
      
      return { 
        total: models.length, 
        available: availableModels.length, 
        models: models.map(m => ({ id: m.id, name: m.name, available: m.isAvailable }))
      };
    });
  }

  async testConnectivity() {
    return this.runTest('Network Connectivity', async () => {
      // Test basic connectivity to auth endpoint
      const authUrl = this.aiService.config.authURL;
      const apiUrl = this.aiService.config.baseURL;
      
      const results = {};
      
      // Test auth endpoint
      try {
        const authResponse = await fetch(`${authUrl}/.well-known/openid_configuration`, {
          method: 'GET',
          timeout: 10000
        });
        results.authEndpoint = {
          reachable: true,
          status: authResponse.status,
          statusText: authResponse.statusText
        };
      } catch (error) {
        results.authEndpoint = {
          reachable: false,
          error: error.message
        };
      }
      
      // Test API endpoint (this will likely fail without auth, but we can check connectivity)
      try {
        const apiResponse = await fetch(`${apiUrl}/v2/lm/deployments`, {
          method: 'GET',
          timeout: 10000
        });
        results.apiEndpoint = {
          reachable: true,
          status: apiResponse.status,
          statusText: apiResponse.statusText
        };
      } catch (error) {
        results.apiEndpoint = {
          reachable: false,
          error: error.message
        };
      }
      
      this.log(`   Auth endpoint: ${results.authEndpoint.reachable ? 'Reachable' : 'Unreachable'}`, 'debug');
      this.log(`   API endpoint: ${results.apiEndpoint.reachable ? 'Reachable' : 'Unreachable'}`, 'debug');
      
      return results;
    });
  }

  async runAllTests() {
    this.log('🚀 Starting Simple AI Integration Tests\n', 'info');
    
    const tests = [
      () => this.testConfiguration(),
      () => this.testConnectivity(),
      () => this.testAuthentication(),
      () => this.testHealthCheck(),
      () => this.testModelListing()
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
    } else if (this.results.passed > 0) {
      this.log('\n⚠️  Some tests failed, but basic connectivity is working.', 'info');
    } else {
      this.log('\n❌ All tests failed. Check configuration and network connectivity.', 'info');
    }

    // Provide recommendations
    this.log('\n💡 Recommendations:', 'info');
    if (this.results.tests.find(t => t.name === 'Configuration Validation' && t.status === 'FAILED')) {
      this.log('   - Check that all required environment variables are set in .env file', 'info');
    }
    if (this.results.tests.find(t => t.name === 'Network Connectivity' && t.status === 'FAILED')) {
      this.log('   - Verify network connectivity and firewall settings', 'info');
    }
    if (this.results.tests.find(t => t.name === 'OAuth Authentication' && t.status === 'FAILED')) {
      this.log('   - Verify SAP AI Core credentials and permissions', 'info');
    }
    if (this.results.tests.find(t => t.name === 'Available Models' && t.status === 'PASSED')) {
      const modelTest = this.results.tests.find(t => t.name === 'Available Models');
      if (modelTest.result.available === 0) {
        this.log('   - No models are currently available. Check SAP AI Core deployment status', 'info');
      } else {
        this.log(`   - ${modelTest.result.available} models are available for use`, 'info');
      }
    }
  }
}

// Run tests
const tester = new AIIntegrationTester();
tester.runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
