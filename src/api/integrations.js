import sapAICoreService from '../services/sapAICoreService.js';
import aiModelConfigService from '../services/aiModelConfigService.js';
import { taskExtractionSchema } from '../schemas/aiSchemas.js';

/**
 * SAP AI Core Integration Layer
 * Provides integration functions for AI operations
 */

// Core AI service instance
export const Core = {
  aiService: sapAICoreService,
  configService: aiModelConfigService
};

/**
 * Invoke LLM with structured prompt and response validation
 * @param {Object} options - LLM invocation options
 * @param {string} options.prompt - The prompt to send to the LLM
 * @param {Object} options.response_json_schema - Zod schema for response validation
 * @param {string} options.model - Optional model override
 * @param {number} options.temperature - Optional temperature setting
 * @param {number} options.maxTokens - Optional max tokens setting
 * @returns {Promise<Object>} Parsed and validated response
 */
export const InvokeLLM = async (options) => {
  try {
    const {
      prompt,
      response_json_schema,
      model,
      temperature = 0.1,
      maxTokens = 4000
    } = options;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Get current model configuration
    const config = aiModelConfigService.getConfig();
    const selectedModel = model || config.selectedModel;

    // Invoke the AI model
    const response = await sapAICoreService.invokeModel(
      prompt,
      response_json_schema,
      {
        model: selectedModel,
        temperature,
        maxTokens
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'AI service request failed');
    }

    return response.data;
  } catch (error) {
    console.error('InvokeLLM error:', error);
    throw error;
  }
};

/**
 * Extract task information from natural language input
 * Specialized function for task creation workflow
 * @param {string} input - Natural language task description
 * @returns {Promise<Object>} Structured task data
 */
export const ExtractTaskFromNaturalLanguage = async (input) => {
  console.log('🚀 ExtractTaskFromNaturalLanguage called with input:', input);
  
  try {
    const response = await sapAICoreService.extractTaskFromNaturalLanguage(input);
    
    if (!response.success) {
      throw new Error(response.error || 'Task extraction failed');
    }

    return response.data;
  } catch (error) {
    console.error('ExtractTaskFromNaturalLanguage error:', error);
    console.log('🔍 DEBUG: Error details:', {
      message: error.message,
      name: error.name,
      type: typeof error,
      constructor: error.constructor.name
    });
    
    // Check if it's an authentication error, model unavailable, or any AI service error
    const shouldUseFallback = 
      error.message.includes('invalid_client') || 
      error.message.includes('Bad credentials') || 
      error.message.includes('401') ||
      error.message.includes('currently unavailable') ||
      error.message.includes('No available models found') ||
      error.message.includes('Authentication failed') ||
      error.message.includes('OAuth token request failed') ||
      error.message.includes('Try switching to a different model') ||
      error.name === 'AIAuthenticationError' ||
      error.name === 'AIModelUnavailableError' ||
      error.name === 'AIServiceError' ||
      // Catch any error that suggests AI service is down
      error.message.toLowerCase().includes('unavailable') ||
      error.message.toLowerCase().includes('authentication') ||
      error.message.toLowerCase().includes('credentials');
    
    console.log('🔍 DEBUG: Should use fallback?', shouldUseFallback);
    console.log('🔍 DEBUG: Checking conditions:');
    console.log('  - includes "Try switching to a different model":', error.message.includes('Try switching to a different model'));
    console.log('  - includes "currently unavailable":', error.message.includes('currently unavailable'));
    console.log('  - error.name:', error.name);
    
    if (shouldUseFallback) {
      console.warn('🛡️ SAP AI Core service unavailable, providing fallback response');
      console.warn('🛡️ Fallback triggered by:', error.message);
      
      // Return a basic structured response based on simple parsing
      return createFallbackTaskExtraction(input);
    }
    
    console.error('❌ Fallback NOT triggered, re-throwing error');
    throw error;
  }
};

/**
 * Fallback task extraction using simple text parsing
 * Used when AI service is unavailable
 */
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
    stakeholders: potentialNames.slice(0, 5), // Limit to 5 names
    tags: [isMeeting ? 'meeting' : 'task'],
    strategic: isHighPriority || lowercaseInput.includes('strategic') || lowercaseInput.includes('important'),
    metadata: isMeeting ? {
      meeting: {
        participants: potentialNames,
        agenda: [input],
        location: undefined
      }
    } : undefined,
    _fallback: true // Flag to indicate this was generated by fallback
  };
}

/**
 * Analyze project for risks and recommendations
 * @param {Object} projectData - Project information
 * @returns {Promise<Object>} Project analysis results
 */
export const AnalyzeProject = async (projectData) => {
  try {
    const response = await sapAICoreService.analyzeProject(projectData);
    
    if (!response.success) {
      throw new Error(response.error || 'Project analysis failed');
    }

    return response.data;
  } catch (error) {
    console.error('AnalyzeProject error:', error);
    throw error;
  }
};

/**
 * Check AI service health and availability
 * @returns {Promise<Object>} Health status
 */
export const CheckAIHealth = async () => {
  try {
    const response = await sapAICoreService.checkHealth();
    return response;
  } catch (error) {
    console.error('CheckAIHealth error:', error);
    return {
      success: false,
      error: error.message,
      data: {
        status: 'unhealthy',
        models: [],
        lastUpdated: new Date().toISOString()
      }
    };
  }
};

/**
 * Get available AI models
 * @returns {Promise<Object>} Available models list
 */
export const GetAvailableModels = async () => {
  try {
    const response = await aiModelConfigService.getAvailableModels();
    return response;
  } catch (error) {
    console.error('GetAvailableModels error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// Legacy integrations - kept as mocks for now
export const SendEmail = async () => { 
  throw new Error('Email integration not available in local mode'); 
};

export const UploadFile = async () => { 
  throw new Error('File upload not available in local mode'); 
};

export const GenerateImage = async () => { 
  throw new Error('Image generation not available in local mode'); 
};

export const ExtractDataFromUploadedFile = async () => { 
  throw new Error('File extraction not available in local mode'); 
};

// Export service instances for direct access if needed
export { sapAICoreService, aiModelConfigService };
