#!/usr/bin/env node

/**
 * AI Functionality Test Script
 * Tests actual AI operations like task extraction and project analysis
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

  async getAvailableModel() {
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
    
    if (runningModels.length === 0) {
      throw new Error('No running models available');
    }

    // Prefer Claude models for better JSON responses
    const claudeModel = runningModels.find(m => 
      m.details?.resources?.backend_details?.model?.name?.toLowerCase().includes('claude')
    );
    
    return claudeModel || runningModels[0];
  }

  async invokeModel(prompt, deploymentId) {
    const token = await this.getAccessToken();
    
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    };

    console.log(`🤖 Invoking model: ${deploymentId}`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    const response = await fetch(`${this.config.baseURL}/v2/inference/deployments/${deploymentId}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'AI-Resource-Group': this.config.resourceGroup
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model invocation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content;
  }

  async testTaskExtraction() {
    console.log('\n🧪 Testing Task Extraction from Natural Language');
    
    const input = "Schedule a high priority meeting with John and Sarah next Friday to discuss the Q1 budget review and project timeline adjustments";
    
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

If information is not explicitly provided, use reasonable defaults or leave optional fields empty.
    `.trim();

    try {
      const model = await this.getAvailableModel();
      const response = await this.invokeModel(prompt, model.id);
      
      console.log('📤 Raw AI Response:');
      console.log(response);
      
      // Try to parse JSON
      try {
        const parsed = JSON.parse(response);
        console.log('\n✅ Parsed Task Data:');
        console.log(`   Title: ${parsed.title}`);
        console.log(`   Type: ${parsed.type}`);
        console.log(`   Priority: ${parsed.priority}`);
        console.log(`   Stakeholders: ${parsed.stakeholders?.join(', ') || 'None'}`);
        console.log(`   Tags: ${parsed.tags?.join(', ') || 'None'}`);
        console.log(`   Strategic: ${parsed.strategic}`);
        
        return { success: true, data: parsed };
      } catch (parseError) {
        console.log('❌ Failed to parse JSON response');
        return { success: false, error: 'Invalid JSON response', rawResponse: response };
      }
    } catch (error) {
      console.log(`❌ Task extraction failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testProjectAnalysis() {
    console.log('\n🧪 Testing Project Risk Analysis');
    
    const projectData = {
      name: "Customer Portal Redesign",
      description: "Complete redesign of customer portal with new UI/UX and enhanced functionality",
      budget: 150000,
      deadline: "2024-03-15",
      team: [
        { name: "Alice Johnson", role: "Frontend Developer" },
        { name: "Bob Smith", role: "Backend Developer" },
        { name: "Carol Davis", role: "UX Designer" }
      ],
      status: "active",
      tasks: [
        { title: "User Research", status: "done" },
        { title: "Wireframe Creation", status: "done" },
        { title: "UI Design", status: "in-progress" },
        { title: "Frontend Development", status: "todo" },
        { title: "Backend API", status: "todo" },
        { title: "Testing", status: "todo" }
      ]
    };

    const prompt = `
Analyze this project for risks, timeline predictions, and recommendations:

Project Details:
- Name: ${projectData.name}
- Description: ${projectData.description}
- Budget: $${projectData.budget}
- Deadline: ${projectData.deadline}
- Team Size: ${projectData.team.length} members
- Status: ${projectData.status}
- Total Tasks: ${projectData.tasks.length}
- Completed Tasks: ${projectData.tasks.filter(t => t.status === 'done').length}

Please provide a JSON response with:
{
  "riskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "keyRisks": [
    {
      "category": "string",
      "description": "string",
      "impact": "low|medium|high",
      "probability": "low|medium|high"
    }
  ],
  "recommendations": [
    {
      "priority": "low|medium|high",
      "action": "string",
      "rationale": "string"
    }
  ],
  "summary": "executive summary string"
}

Focus on practical, actionable insights based on the project data provided.
    `.trim();

    try {
      const model = await this.getAvailableModel();
      const response = await this.invokeModel(prompt, model.id);
      
      console.log('📤 Raw AI Response:');
      console.log(response);
      
      try {
        const parsed = JSON.parse(response);
        console.log('\n✅ Parsed Analysis:');
        console.log(`   Risk Score: ${parsed.riskScore}/100`);
        console.log(`   Risk Level: ${parsed.riskLevel}`);
        console.log(`   Key Risks: ${parsed.keyRisks?.length || 0}`);
        console.log(`   Recommendations: ${parsed.recommendations?.length || 0}`);
        console.log(`   Summary: ${parsed.summary?.substring(0, 100)}...`);
        
        return { success: true, data: parsed };
      } catch (parseError) {
        console.log('❌ Failed to parse JSON response');
        return { success: false, error: 'Invalid JSON response', rawResponse: response };
      }
    } catch (error) {
      console.log(`❌ Project analysis failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runTests() {
    console.log('🚀 Starting AI Functionality Tests\n');
    
    const results = {
      taskExtraction: await this.testTaskExtraction(),
      projectAnalysis: await this.testProjectAnalysis()
    };
    
    console.log('\n📊 Final Results:');
    console.log(`   Task Extraction: ${results.taskExtraction.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Project Analysis: ${results.projectAnalysis.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n🎯 Success Rate: ${(successCount / totalCount * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n🎉 All AI functionality tests passed! The integration is fully working.');
    } else {
      console.log('\n⚠️  Some AI functionality tests failed. Check the error details above.');
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
