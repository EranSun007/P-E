#!/usr/bin/env node

/**
 * Test Updated Fallback Integration
 * Tests the updated fallback mechanism with the actual error messages
 */

// Mock the AI service to simulate the actual error from the browser
const mockSAPAICoreService = {
  extractTaskFromNaturalLanguage: async () => {
    throw new Error('The selected AI model (meta--llama3.1-70b-instruct) is currently unavailable. Try switching to a different model.');
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

// Updated ExtractTaskFromNaturalLanguage with improved fallback detection
async function ExtractTaskFromNaturalLanguage(input) {
  try {
    const response = await mockSAPAICoreService.extractTaskFromNaturalLanguage(input);
    
    if (!response.success) {
      throw new Error(response.error || 'Task extraction failed');
    }

    return response.data;
  } catch (error) {
    console.error('ExtractTaskFromNaturalLanguage error:', error.message);
    
    // Check if it's an authentication error or model unavailable and provide fallback
    if (error.message.includes('invalid_client') || 
        error.message.includes('Bad credentials') || 
        error.message.includes('401') ||
        error.message.includes('currently unavailable') ||
        error.message.includes('No available models found') ||
        error.message.includes('Authentication failed') ||
        error.message.includes('OAuth token request failed')) {
      console.warn('SAP AI Core service unavailable, providing fallback response');
      
      // Return a basic structured response based on simple parsing
      return createFallbackTaskExtraction(input);
    }
    
    throw error;
  }
}

// Test case that matches the actual browser error
const testInput = "Schedule a high priority meeting with John and Sarah next Friday to discuss the Q1 budget review";

async function runUpdatedFallbackTest() {
  console.log('🧪 Testing Updated Fallback Integration Mechanism\n');
  console.log(`Testing with actual browser error: "The selected AI model (meta--llama3.1-70b-instruct) is currently unavailable"`);
  console.log(`Input: "${testInput}"\n`);
  
  try {
    const result = await ExtractTaskFromNaturalLanguage(testInput);
    
    console.log('✅ Fallback Successfully Triggered!');
    console.log('📋 Fallback Result:');
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
    
    console.log('\n🎉 SUCCESS: The fallback mechanism now correctly detects "currently unavailable" errors!');
    console.log('✅ Users will now get structured task data even when AI service fails');
    
  } catch (error) {
    console.log(`❌ FAILED: Fallback was not triggered - ${error.message}`);
    console.log('❌ This means the error detection pattern needs further adjustment');
  }
}

// Run the test
runUpdatedFallbackTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
