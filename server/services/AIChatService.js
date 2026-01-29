/**
 * AI Chat Service
 * Wrapper around SAP AI SDK Orchestration for chat completions
 */

import { OrchestrationClient } from '@sap-ai-sdk/orchestration';
import AIConnectionService from './AIConnectionService.js';
import MCPService from './MCPService.js';

// System prompt for the P&E Manager AI assistant
const BASE_SYSTEM_PROMPT = `You are an AI assistant for P&E Manager, a project and team management application.

You can help users by:
- Querying their tasks, projects, team members, and calendar
- Creating, updating, and managing tasks
- Scheduling events and setting reminders
- Providing insights and summaries about their work
- Analyzing team workload and project progress

Guidelines:
- Always confirm before taking destructive actions (like deleting)
- Use the user's name when you know it
- Be concise but helpful
- When showing data, format it clearly
- If you're unsure about something, ask for clarification

Current date: ${new Date().toISOString().split('T')[0]}`;

/**
 * Build the full system prompt with optional page context
 * @param {Object} pageContext - Page context object with summary, page, timestamp, selection
 * @returns {string} Full system prompt
 */
function buildSystemPrompt(pageContext = null) {
  let prompt = BASE_SYSTEM_PROMPT;

  if (pageContext && pageContext.summary) {
    prompt += `\n\n## Current Page Context
The user is currently viewing a specific page in the application. Here's what they can see:

${pageContext.summary}`;

    // Add staleness warning if context is old (> 5 minutes)
    if (pageContext.timestamp) {
      const contextTime = new Date(pageContext.timestamp).getTime();
      const now = Date.now();
      const minutesAgo = Math.floor((now - contextTime) / (60 * 1000));

      if (minutesAgo >= 5) {
        prompt += `\n\nNote: This context was captured ${minutesAgo} minutes ago and may be outdated. If your answer depends on current data, suggest the user refresh the context.`;
      }
    }

    // Add selection info if present
    if (pageContext.selection && pageContext.selection.id) {
      prompt += `\n\nThe user has a specific item selected (ID: ${pageContext.selection.id}, type: ${pageContext.selection.type || 'unknown'}). When they ask about "this item" or "the selected item", they mean this one.`;
    }
  }

  return prompt;
}

class AIChatService {
  constructor() {
    this.client = null;
  }

  /**
   * Get or create the orchestration client
   * @param {Array} tools - Optional tools to include
   * @param {Object} pageContext - Optional page context to include in system prompt
   * @returns {OrchestrationClient}
   */
  getClient(tools = [], pageContext = null) {
    if (!AIConnectionService.isAvailable()) {
      throw new Error('AI Core is not configured. Please set up AICORE_SERVICE_KEY or bind the AI Core service.');
    }

    const deploymentConfig = AIConnectionService.getDeploymentConfig();
    const modelName = AIConnectionService.getModelName();
    const modelParams = AIConnectionService.getModelParams();

    // Build system prompt with page context if provided
    const systemPrompt = buildSystemPrompt(pageContext);

    // Build the orchestration config according to SAP AI SDK format
    // Tools go in prompt.tools, not at the promptTemplating level
    const orchestrationConfig = {
      promptTemplating: {
        model: {
          name: modelName,
          params: modelParams
        },
        prompt: {
          template: [
            { role: 'system', content: systemPrompt }
          ],
          // Include tools in the prompt object if provided
          ...(tools && tools.length > 0 ? { tools } : {})
        }
      }
    };

    return new OrchestrationClient(orchestrationConfig, deploymentConfig);
  }

  /**
   * Send a chat message and get a response
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Optional parameters
   * @param {Array} options.tools - Tools available to the AI
   * @param {Array} options.messagesHistory - Previous messages for context
   * @param {Object} options.pageContext - Page context for the AI
   * @returns {Promise<Object>} Chat response
   */
  async chat(messages, options = {}) {
    try {
      const { tools = [], messagesHistory = [], pageContext = null } = options;
      const client = this.getClient(tools, pageContext);

      const response = await client.chatCompletion({
        messages,
        messagesHistory
      });

      // Get the assistant message to extract tool calls
      const assistantMessage = response.getAssistantMessage();

      return {
        content: response.getContent(),
        finishReason: response.getFinishReason(),
        tokenUsage: response.getTokenUsage(),
        toolCalls: assistantMessage?.tool_calls || null,
        assistantMessage,
        allMessages: response.getAllMessages()
      };
    } catch (error) {
      console.error('AIChatService.chat error:', error);
      throw new Error(`AI chat failed: ${error.message}`);
    }
  }

  /**
   * Stream a chat response
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Optional parameters
   * @param {AbortSignal} signal - Optional abort signal
   * @returns {AsyncGenerator} Stream of response chunks
   */
  async *streamChat(messages, options = {}, signal = null) {
    try {
      const { tools = [], messagesHistory = [] } = options;
      const client = this.getClient(tools);

      const response = await client.stream(
        {
          messages,
          messagesHistory
        },
        signal
      );

      for await (const chunk of response.stream.toContentStream()) {
        yield {
          type: 'content',
          content: chunk
        };
      }

      // After stream completes, yield final metadata
      yield {
        type: 'done',
        finishReason: response.getFinishReason(),
        tokenUsage: response.getTokenUsage(),
        toolCalls: response.getToolCalls()
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        yield { type: 'aborted' };
        return;
      }
      console.error('AIChatService.streamChat error:', error);
      throw new Error(`AI stream failed: ${error.message}`);
    }
  }

  /**
   * Chat with tool calling support (agentic)
   * Handles the multi-turn tool call flow
   * @param {Array} messages - User messages
   * @param {Array} tools - Available tools
   * @param {Function} toolExecutor - Function to execute tool calls
   * @param {Array} messagesHistory - Previous conversation history
   * @param {Object} pageContext - Optional page context
   * @returns {Promise<Object>} Final response after tool execution
   */
  async chatWithTools(messages, tools, toolExecutor, messagesHistory = [], pageContext = null) {
    const MAX_TOOL_ITERATIONS = 5;
    let currentMessages = [...messages];
    let currentHistory = [...messagesHistory];
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await this.chat(currentMessages, {
        tools,
        messagesHistory: currentHistory,
        pageContext  // Pass page context for system prompt enrichment
      });

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return response;
      }

      // Execute each tool call
      const toolResults = [];
      for (const toolCall of response.toolCalls) {
        try {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`Executing tool: ${functionName}`, functionArgs);
          const result = await toolExecutor(functionName, functionArgs);

          toolResults.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          });
        } catch (error) {
          console.error(`Tool execution error for ${toolCall.function.name}:`, error);
          toolResults.push({
            role: 'tool',
            content: JSON.stringify({ error: error.message }),
            tool_call_id: toolCall.id
          });
        }
      }

      // Update history with assistant message and tool results
      currentHistory = response.allMessages;
      currentMessages = toolResults;
    }

    throw new Error('Max tool iterations exceeded');
  }

  /**
   * Detect if message is a code/implementation question
   * @param {string} message - User message
   * @returns {boolean}
   */
  detectCodeQuestion(message) {
    const codeKeywords = [
      /how (do|does|to|can) (i|we|you)/i,
      /implement(ing|ation)?/i,
      /\b(write|create|build|make|develop)\b/i,
      /\b(code|function|class|method|component)\b/i,
      /\b(API|endpoint|route|handler)\b/i,
      /\b(error|bug|issue|problem|fix)\b/i,
      /\b(js|jsx|ts|tsx|python|java|go|rust)\b/i
    ];
    return codeKeywords.some(regex => regex.test(message));
  }

  /**
   * Format knowledge base results for AI context
   * @param {Array} results - Code search results
   * @returns {string}
   */
  formatKnowledgeContext(results) {
    return results.map((r, idx) => {
      const filePath = r.filePath || r.file_path || 'unknown';
      const language = r.language || 'plaintext';
      const code = r.code || r.content || '';
      return `[${idx + 1}] ${filePath}:\n\`\`\`${language}\n${code}\n\`\`\``;
    }).join('\n\n');
  }

  /**
   * Chat with automatic knowledge base context injection
   * @param {Array} messages - User messages
   * @param {Object} options - Chat options (tools, messagesHistory, pageContext)
   * @returns {Promise<Object>} Chat response
   */
  async chatWithKnowledgeContext(messages, options = {}) {
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Check if message needs code context
    if (this.detectCodeQuestion(lastUserMessage)) {
      try {
        const codeResults = await MCPService.searchCode({
          query: lastUserMessage,
          limit: 3,
          threshold: 0.6
        });

        // Only inject if we got good results
        if (codeResults.results && codeResults.results.length > 0) {
          const contextMessage = {
            role: 'system',
            content: `Relevant code from knowledge base (use this to inform your response):\n\n${this.formatKnowledgeContext(codeResults.results)}`
          };

          // Prepend context to messages
          messages = [contextMessage, ...messages];
        }
      } catch (error) {
        console.error('Knowledge context injection failed:', error);
        // Continue without context rather than failing
      }
    }

    return this.chat(messages, options);
  }

  /**
   * Check if AI service is available
   * @returns {boolean}
   */
  isAvailable() {
    return AIConnectionService.isAvailable();
  }
}

export default new AIChatService();
