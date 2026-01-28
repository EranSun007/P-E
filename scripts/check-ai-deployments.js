/**
 * Script to check available AI Core deployments
 * Run with: node scripts/check-ai-deployments.js
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

async function getAccessToken() {
  const serviceKey = JSON.parse(process.env.AICORE_SERVICE_KEY);
  const tokenUrl = `${serviceKey.url}/oauth/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', serviceKey.clientid);
  params.append('client_secret', serviceKey.clientsecret);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function listDeployments(token, resourceGroup = 'default') {
  const serviceKey = JSON.parse(process.env.AICORE_SERVICE_KEY);
  const apiUrl = serviceKey.serviceurls.AI_API_URL;

  const response = await fetch(`${apiUrl}/v2/lm/deployments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'AI-Resource-Group': resourceGroup
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Deployments request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function listScenarios(token, resourceGroup = 'default') {
  const serviceKey = JSON.parse(process.env.AICORE_SERVICE_KEY);
  const apiUrl = serviceKey.serviceurls.AI_API_URL;

  const response = await fetch(`${apiUrl}/v2/lm/scenarios`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'AI-Resource-Group': resourceGroup
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Scenarios request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('🔑 Getting access token...');
    const token = await getAccessToken();
    console.log('✅ Token obtained\n');

    console.log('📋 Fetching scenarios...');
    try {
      const scenarios = await listScenarios(token);
      console.log('Scenarios:', JSON.stringify(scenarios, null, 2));
    } catch (e) {
      console.log('Could not fetch scenarios:', e.message);
    }

    console.log('\n📋 Fetching deployments...');
    const deployments = await listDeployments(token);

    if (!deployments.resources || deployments.resources.length === 0) {
      console.log('⚠️ No deployments found in resource group "default"');
      console.log('\nTrying other common resource groups...');

      for (const rg of ['ai', 'genai', 'orchestration']) {
        try {
          const rgDeployments = await listDeployments(token, rg);
          if (rgDeployments.resources && rgDeployments.resources.length > 0) {
            console.log(`\n✅ Found deployments in resource group "${rg}":`);
            console.log(JSON.stringify(rgDeployments, null, 2));
          }
        } catch (e) {
          // Skip
        }
      }
    } else {
      console.log('✅ Found deployments:');
      console.log(JSON.stringify(deployments, null, 2));

      // Highlight orchestration deployments
      const orchDeployments = deployments.resources.filter(d =>
        d.scenarioId?.includes('orchestration') ||
        d.configurationName?.includes('orchestration')
      );

      if (orchDeployments.length > 0) {
        console.log('\n🎯 Orchestration deployments (use these for AI chat):');
        orchDeployments.forEach(d => {
          console.log(`  - ID: ${d.id}`);
          console.log(`    Status: ${d.status}`);
          console.log(`    Scenario: ${d.scenarioId}`);
          console.log(`    Configuration: ${d.configurationName}`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
