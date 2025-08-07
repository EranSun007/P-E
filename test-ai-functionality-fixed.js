#!/usr/bin/env node

/**
 * AI Functionality Test Script (Fixed for SAP AI Core)
 * Tests actual AI operations using the correct SAP AI Core inference endpoints
 */

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
    
    Object.assign(process.env, envVars);
    console.log('✅ Environment variables loaded');
  } catch (error) {
    console.log('⚠️  Using existing environment variables');
  }
}

loadEnvFile();

class AIFunctionalityTester {
  constructor() {
    this.config = {
      baseURL: process.env.VITE_SAP_AI_CORE_API_URL,
      clientId: process.env.VITE_SAP_AI_CORE_CLIENT_ID,
      clientSecret: process.env.VITE_SAP_AI_CORE_CLIENT_SECRET,
      authURL: process.env.VITE_SAP_AI_CORE_AUTH_URL,
      resourceGroup: process.env.VITE_SAP_AI_CORE_RESOURCE_GROUP || 'default',
      timeout: 30000
    };

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

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
      throw new Error(`OAuth failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.accessToken = tokenData.access_token;
    
    const expiresIn = tokenData.expires_in || 3600;
    this.tokenExpiry = Date.now() + (expiresIn - 300) * 1000;

    return this.accessToken;
  }

  async getAvailableModels() {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.config.baseURL}/v2/lm/deployments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AI-Resource-Group': this.config.resourceGroup
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get models: ${response.status}`);
    }

    const data = await response.json();
    const runningModels = data.resources?.filter(d => d.status === 'RUNNING') || [];
    
    return runningModels.map(model => ({
      id: model.id,
      name: model.details?.resources?.backend_details?.model?.name || model.id,
      status: model.status,
      details: model.details
    }));
  }

  async testModelInference(deploymentId, prompt) {
    const token = await this.getAccessToken();
    
    // Try different inference endpoints based on model type
    const endpoints = [
      `/v2/inference/deployments/${deploymentId}/completions`,
      `/v2/inference/deployments/${deploymentId}/chat/completions`,
      `/v2/inference/deployments/${deploymentId}/generate`,
      `/v2/inference/deployments/${deploymentId}`
    ];

    const requestBodies = [
      // Standard completions format
      {
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.1
      },
      // Chat completions format
      {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.1
      },
      // Generate format
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.1
        }
      },
      // Simple format
      {
        input: prompt,
        max_tokens: 2000,
        temperature: 0.1
      }
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      const requestBody = requestBodies[i];
      
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`);
        
        const response = await fetch(`${this.config.baseURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'AI-Resource-Group': this.config.resourceGroup
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Success with endpoint: ${endpoint}`);
          return { success: true, endpoint, result };
        } else {
          const errorText = await response.text();
          console.log(`❌ Failed with endpoint ${endpoint}: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Error with endpoint ${endpoint}: ${error.message}`);
      }
    }

    return { success: false, error: 'All inference endpoints failed' };
  }

  async testTaskExtraction() {
    console.log('\n🧪 Testing Task Extraction from Natural Language');
    
    const input = "Schedule a high priority meeting with John and Sarah next Friday to discuss the Q1 budget review and project timeline adjustments";
    
    const prompt = `Extract structured task information from this natural language input: "${input}"

Please analyze the text and extract:
1. Task title (clear, actionable)
2. Description (if provided or can be inferred)
3. Task type: meeting, metric, action, or generic
4. Priority: low, medium, high, or urgent
5. Due date (if mentioned, in ISO format)
6. Stakeholders (people mentioned)
7. Tags (relevant categories or keywords)
8. Whether it's strategic (true/false)

Return the response as a JSON object with these fields:
{
  "title": "extracted title",
  "description": "description if any",
  "type": "meeting|metric|action|generic",
  "priority": "low|medium|high|urgent",
  "due_date": "ISO date if mentioned",
  "stakeholders": ["list", "of", "people"],
  "tags": ["relevant", "keywords"],
  "strategic": true/false
}

If information is not explicitly provided, use reasonable defaults or leave optional fields empty.`;

    try {
      const models = await this.getAvailableModels();
      console.log(`📋 Found ${models.length} available models`);
      
      // Try each model until one works
      for (const model of models) {
        console.log(`🤖 Testing model: ${model.name} (${model.id})`);
        
        const result = await this.testModelInference(model.id, prompt);
        
        if (result.success) {
          console.log('📤 Raw AI Response:');
          console.log(JSON.stringify(result.result, null, 2));
          
          // Try to extract text from various response formats
          let responseText = '';
          if (result.result.choices && result.result.choices[0]) {
            responseText = result.result.choices[0].message?.content || result.result.choices[0].text || '';
          } else if (result.result.generated_text) {
            responseText = result.result.generated_text;
          } else if (result.result.text) {
            responseText = result.result.text;
          } else if (result.result.output) {
            responseText = result.result.output;
          } else if (typeof result.result === 'string') {
            responseText = result.result;
          }
          
          if (responseText) {
            try {
              // Try to find JSON in the response
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('\n✅ Parsed Task Data:');
                console.log(`   Title: ${parsed.title}`);
                console.log(`   Type: ${parsed.type}`);
                console.log(`   Priority: ${parsed.priority}`);
                console.log(`   Stakeholders: ${parsed.stakeholders?.join(', ') || 'None'}`);
                console.log(`   Tags: ${parsed.tags?.join(', ') || 'None'}`);
                console.log(`   Strategic: ${parsed.strategic}`);
                
                return { success: true, data: parsed, model: model.name, endpoint: result.endpoint };
              } else {
                console.log('📝 Response text (no JSON found):');
                console.log(responseText);
                return { success: false, error: 'No JSON found in response', rawResponse: responseText };
              }
            } catch (parseError) {
              console.log('❌ Failed to parse JSON from response');
              console.log('📝 Raw response text:');
              console.log(responseText);
              return { success: false, error: 'Invalid JSON response', rawResponse: responseText };
            }
          } else {
            console.log('❌ No text content found in response');
            return { success: false, error: 'No text content in response', rawResponse: result.result };
          }
        }
      }
      
      return { success: false, error: 'No models could process the request' };
    } catch (error) {
      console.log(`❌ Task extraction failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testSimpleCompletion() {
    console.log('\n🧪 Testing Simple Text Completion');
    
    const prompt = "Complete this sentence: The weather today is";
    
    try {
      const models = await this.getAvailableModels();
      console.log(`📋 Found ${models.length} available models`);
      
      // Try each model until one works
      for (const model of models) {
        console.log(`🤖 Testing model: ${model.name} (${model.id})`);
        
        const result = await this.testModelInference(model.id, prompt);
        
        if (result.success) {
          console.log('📤 Raw AI Response:');
          console.log(JSON.stringify(result.result, null, 2));
          
          // Extract text from response
          let responseText = '';
          if (result.result.choices && result.result.choices[0]) {
            responseText = result.result.choices[0].message?.content || result.result.choices[0].text || '';
          } else if (result.result.generated_text) {
            responseText = result.result.generated_text;
          } else if (result.result.text) {
            responseText = result.result.text;
          } else if (result.result.output) {
            responseText = result.result.output;
          } else if (typeof result.result === 'string') {
            responseText = result.result;
          }
          
          console.log('\n✅ Completion Result:');
          console.log(`   Prompt: ${prompt}`);
          console.log(`   Response: ${responseText}`);
          console.log(`   Model: ${model.name}`);
          console.log(`   Endpoint: ${result.endpoint}`);
          
          return { success: true, data: responseText, model: model.name, endpoint: result.endpoint };
        }
      }
      
      return { success: false, error: 'No models could process the request' };
    } catch (error) {
      console.log(`❌ Simple completion failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runTests() {
    console.log('🚀 Starting AI Functionality Tests\n');
    
    const results = {
      simpleCompletion: await this.testSimpleCompletion(),
      taskExtraction: await this.testTaskExtraction()
    };
    
    console.log('\n📊 Final Results:');
    console.log(`   Simple Completion: ${results.simpleCompletion.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Task Extraction: ${results.taskExtraction.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n🎯 Success Rate: ${(successCount / totalCount * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 All AI functionality tests passed! The integration is fully working.');
    } else if (successCount > 0) {
      console.log('\n⚠️  Some AI functionality tests passed. Basic AI integration is working.');
      
      // Show working configuration
      const workingTest = Object.values(results).find(r => r.success);
      if (workingTest && workingTest.model && workingTest.endpoint) {
        console.log('\n💡 Working Configuration:');
        console.log(`   Model: ${workingTest.model}`);
        console.log(`   Endpoint: ${workingTest.endpoint}`);
      }
    } else {
      console.log('\n❌ All AI functionality tests failed. Check the error details above.');
    }
    
    return results;
  }
}

// Run tests
const tester = new AIFunctionalityTester();
tester.runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
