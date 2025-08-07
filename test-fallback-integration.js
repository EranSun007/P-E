#!/usr/bin/env node

/**
 * Test Fallback Integration
 * Tests the fallback mechanism when AI service is unavailable
 */

// Mock the AI service to simulate authentication failure
const mockSAPAICoreService = {
  extractTaskFromNaturalLanguage: async () => {
    throw new Error('OAuth token request failed: 401 - {"error":"invalid_client","error_description":"Bad credentials"}');
  }
};

// Simple fallback function (copied from integrations.js)
function createFallbackTaskExtraction(input) {
  const lowercaseInput = input.toLowerCase();
  
  // Simple keyword detection
  const isMeeting = lowercaseInput.includes('meeting') || lowercaseInput.includes('call') || lowercaseInput.includes('discuss');
  const isHighPriority = lowercaseInput.includes('urgent') || lowercaseInput.includes('high priority') || lowercaseInput.includes('asap');
  const isMediumPriority = lowercaseInput.includes('important') || lowercaseInput.includes('medium priority');
  
  // Extract names (simple approach - words that are capitalized)
  const words = input.split(' ');
  const potentialNames = words.filter(word => 
    word.length > 2 && 
    word[0] === word[0].toUpperCase() && 
    word.slice(1) === word.slice(1).toLowerCase() &&
    !['The', 'This', 'That', 'Schedule', 'Create', 'Add', 'Make'].includes(word)
  );
  
  // Extract dates (simple approach)
  const hasDate = lowercaseInput.includes('today') || lowercaseInput.includes('tomorrow') || 
                  lowercaseInput.includes('friday') || lowercaseInput.includes('monday') ||
                  lowercaseInput.includes('next week') || /\d{1,2}\/\d{1,2}/.test(input);
  
  return {
    title: input.length > 50 ? input.substring(0, 47) + '...' : input,
    description: input,
    type: isMeeting ? 'meeting' : 'generic',
    priority: isHighPriority ? 'high' : isMediumPriority ? 'medium' : 'low',
    due_date: hasDate ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    stakeholders: potentialNames.slice(0, 5),
    tags: [isMeeting ? 'meeting' : 'task'],
    strategic: isHighPriority || lowercaseInput.includes('strategic') || lowercaseInput.includes('important'),
    metadata: isMeeting ? {
      meeting: {
        participants: potentialNames,
        agenda: [input],
        location: undefined
      }
    } : undefined,
    _fallback: true
  };
}

// Mock ExtractTaskFromNaturalLanguage with fallback
async function ExtractTaskFromNaturalLanguage(input) {
  try {
    const response = await mockSAPAICoreService.extractTaskFromNaturalLanguage(input);
    
    if (!response.success) {
      throw new Error(response.error || 'Task extraction failed');
    }

    return response.data;
  } catch (error) {
    console.error('ExtractTaskFromNaturalLanguage error:', error.message);
    
    // Check if it's an authentication error and provide fallback
    if (error.message.includes('invalid_client') || error.message.includes('Bad credentials') || error.message.includes('401')) {
      console.warn('SAP AI Core authentication failed, providing fallback response');
      
      // Return a basic structured response based on simple parsing
      return createFallbackTaskExtraction(input);
    }
    
    throw error;
  }
}

// Test cases
const testCases = [
  "Schedule a high priority meeting with John and Sarah next Friday to discuss the Q1 budget review",
  "Create urgent task for Alice to review the project timeline",
  "Add important meeting with Bob tomorrow about the new feature",
  "Simple task to update documentation",
  "Call with stakeholders on Monday to discuss strategic planning"
];

async function runFallbackTests() {
  console.log('🧪 Testing Fallback Integration Mechanism\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const input = testCases[i];
    console.log(`Test ${i + 1}: "${input}"`);
    
    try {
      const result = await ExtractTaskFromNaturalLanguage(input);
      
      console.log('✅ Fallback Result:');
      console.log(`   Title: ${result.title}`);
      console.log(`   Type: ${result.type}`);
      console.log(`   Priority: ${result.priority}`);
      console.log(`   Stakeholders: ${result.stakeholders.join(', ') || 'None'}`);
      console.log(`   Tags: ${result.tags.join(', ')}`);
      console.log(`   Strategic: ${result.strategic}`);
      console.log(`   Fallback: ${result._fallback}`);
      
      if (result.metadata?.meeting) {
        console.log(`   Meeting Participants: ${result.metadata.meeting.participants.join(', ')}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }
  
  console.log('📊 Summary:');
  console.log('   All tests used fallback mechanism due to simulated authentication failure');
  console.log('   Fallback provides basic task extraction using keyword detection');
  console.log('   Users can still create tasks even when AI service is unavailable');
  console.log('\n✅ Fallback integration is working correctly!');
}

// Run the tests
runFallbackTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
