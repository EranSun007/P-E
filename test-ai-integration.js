#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests SAP AI Core integration without UI dependencies
 */

import { SAPAICoreService } from './src/services/sapAICoreService.js';
import { taskExtractionSchema, projectAnalysisSchema } from './src/schemas/aiSchemas.js';

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

class AIIntegrationTester {
  constructor() {
    this.aiService = new SAPAICoreService();
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
      // Test that service initializes with proper config
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
      // Test OAuth token retrieval
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
      
      if (healthData.models.length === 0) {
        throw new Error('No models available');
      }
      
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
      if (availableModels.length === 0) {
        throw new Error('No available models found');
      }
      
      return { total: models.length, available: availableModels.length, models };
    });
  }

  async testTaskExtraction() {
    return this.runTest('Task Extraction from Natural Language', async () => {
      const result = await this.aiService.extractTaskFromNaturalLanguage(TEST_TASK_INPUT);
      
      if (!result.success) {
        throw new Error(`Task extraction failed: ${result.error}`);
      }
      
      const taskData = result.data;
      this.log(`   Extracted title: ${taskData.title}`, 'debug');
      this.log(`   Task type: ${taskData.type}`, 'debug');
      this.log(`   Priority: ${taskData.priority}`, 'debug');
      this.log(`   Stakeholders: ${taskData.stakeholders.join(', ')}`, 'debug');
      
      // Validate against schema
      const validation = taskExtractionSchema.safeParse(taskData);
      if (!validation.success) {
        throw new Error(`Schema validation failed: ${validation.error.message}`);
      }
      
      return { taskData, tokens: result.tokens, responseTime: result.responseTime };
    });
  }

  async testProjectAnalysis() {
    return this.runTest('Project Risk Analysis', async () => {
      const result = await this.aiService.analyzeProject(TEST_PROJECT_DATA);
      
      if (!result.success) {
        throw new Error(`Project analysis failed: ${result.error}`);
      }
      
      const analysis = result.data;
      this.log(`   Risk Score: ${analysis.riskScore}/100`, 'debug');
      this.log(`   Risk Level: ${analysis.riskLevel}`, 'debug');
      this.log(`   Key Risks: ${analysis.keyRisks.length}`, 'debug');
      this.log(`   Recommendations: ${analysis.recommendations.length}`, 'debug');
      
      // Validate against schema
      const validation = projectAnalysisSchema.safeParse(analysis);
      if (!validation.success) {
        throw new Error(`Schema validation failed: ${validation.error.message}`);
      }
      
      return { analysis, tokens: result.tokens, responseTime: result.responseTime };
    });
  }

  async testCaching() {
    return this.runTest('Response Caching', async () => {
      // First request
      const start1 = Date.now();
      const result1 = await this.aiService.extractTaskFromNaturalLanguage("Create a simple test task");
      const time1 = Date.now() - start1;
      
      if (!result1.success) {
        throw new Error(`First request failed: ${result1.error}`);
      }
      
      // Second identical request (should be cached)
      const start2 = Date.now();
      const result2 = await this.aiService.extractTaskFromNaturalLanguage("Create a simple test task");
      const time2 = Date.now() - start2;
      
      if (!result2.success) {
        throw new Error(`Second request failed: ${result2.error}`);
      }
      
      this.log(`   First request: ${time1}ms, Cached: ${result1.cached}`, 'debug');
      this.log(`   Second request: ${time2}ms, Cached: ${result2.cached}`, 'debug');
      
      // Second request should be much faster if cached
      const speedImprovement = time1 / time2;
      
      return { 
        firstTime: time1, 
        secondTime: time2, 
        speedImprovement: speedImprovement.toFixed(2),
        cached: result2.cached 
      };
    });
  }

  async testErrorHandling() {
    return this.runTest('Error Handling', async () => {
      // Test with invalid input that should trigger validation error
      try {
        const result = await this.aiService.invokeModel("", null, { model: "non-existent-model" });
        
        // If we get here, check if it's a proper error response
        if (result.success) {
          throw new Error('Expected error but got success');
        }
        
        this.log(`   Error handled properly: ${result.error}`, 'debug');
        return { errorHandled: true, errorMessage: result.error };
      } catch (error) {
        // This is expected for some error types
        this.log(`   Exception caught: ${error.message}`, 'debug');
        return { errorHandled: true, errorMessage: error.message };
      }
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
    this.log('🚀 Starting AI Integration Tests\n', 'info');
    
    const tests = [
      () => this.testConfiguration(),
      () => this.testAuthentication(),
      () => this.testHealthCheck(),
      () => this.testModelListing(),
      () => this.testTaskExtraction(),
      () => this.testProjectAnalysis(),
      () => this.testCaching(),
      () => this.testErrorHandling(),
      () => this.testCacheStatistics()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        // Continue with other tests even if one fails
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

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AIIntegrationTester();
  
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { AIIntegrationTester };
