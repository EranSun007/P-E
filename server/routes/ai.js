/**
 * AI Routes
 * API endpoints for AI chat and agent capabilities
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import AIChatService from '../services/AIChatService.js';
import AIAgentService from '../services/AIAgentService.js';
import AIConnectionService from '../services/AIConnectionService.js';
import { ALL_TOOLS, READ_ONLY_TOOLS } from '../ai/tools.js';

const router = express.Router();

// All AI routes require authentication
router.use(authMiddleware);

/**
 * GET /api/ai/status
 * Check if AI service is available and configured
 */
router.get('/status', (req, res) => {
  const isAvailable = AIChatService.isAvailable();
  const modelName = isAvailable ? AIConnectionService.getModelName() : null;

  res.json({
    available: isAvailable,
    model: modelName,
    features: {
      chat: isAvailable,
      streaming: isAvailable,
      tools: isAvailable,
      agentic: isAvailable
    }
  });
});

/**
 * GET /api/ai/tools
 * List available tools
 */
router.get('/tools', (req, res) => {
  const tools = ALL_TOOLS.map(t => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters
  }));

  res.json({ tools });
});

/**
 * POST /api/ai/chat
 * Send a chat message and get a response
 * Body: { messages: [{role, content}], history?: [], useTools?: boolean, pageContext?: object }
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, history = [], useTools = true, pageContext = null } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'messages array is required'
      });
    }

    if (!AIChatService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'AI service is not configured'
      });
    }

    let response;

    if (useTools) {
      // Use agentic chat with tools
      const toolExecutor = AIAgentService.createToolExecutor(req.user.id);
      response = await AIChatService.chatWithTools(
        messages,
        ALL_TOOLS,
        toolExecutor,
        history,
        pageContext
      );
    } else {
      // Simple chat with automatic knowledge context injection
      response = await AIChatService.chatWithKnowledgeContext(messages, {
        messagesHistory: history,
        pageContext
      });
    }

    res.json({
      content: response.content,
      finishReason: response.finishReason,
      tokenUsage: response.tokenUsage
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'AI chat failed'
    });
  }
});

/**
 * POST /api/ai/chat/stream
 * Stream a chat response using Server-Sent Events
 * Body: { messages: [{role, content}], history?: [] }
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const { messages, history = [] } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'messages array is required'
      });
    }

    if (!AIChatService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'AI service is not configured'
      });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Handle client disconnect
    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      // Stream the response
      const stream = AIChatService.streamChat(
        messages,
        { messagesHistory: history },
        abortController.signal
      );

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({
            type: 'done',
            finishReason: chunk.finishReason,
            tokenUsage: chunk.tokenUsage
          })}\n\n`);
        } else if (chunk.type === 'aborted') {
          res.write(`data: ${JSON.stringify({ type: 'aborted' })}\n\n`);
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('AI stream setup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'AI stream failed'
    });
  }
});

/**
 * POST /api/ai/execute-tool
 * Manually execute a tool (for testing/debugging)
 * Body: { tool: string, args: object }
 */
router.post('/execute-tool', async (req, res) => {
  try {
    const { tool, args } = req.body;

    if (!tool) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tool name is required'
      });
    }

    const result = await AIAgentService.executeTool(tool, args || {}, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Tool execution failed'
    });
  }
});

/**
 * POST /api/ai/summarize
 * Quick action: Summarize current tasks
 */
router.post('/summarize', async (req, res) => {
  try {
    const { type = 'tasks' } = req.body;

    if (!AIChatService.isAvailable()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'AI service is not configured'
      });
    }

    const toolExecutor = AIAgentService.createToolExecutor(req.user.id);

    let prompt;
    switch (type) {
      case 'tasks':
        prompt = 'Give me a brief summary of my current tasks. Group them by status and highlight any that are overdue or due soon.';
        break;
      case 'projects':
        prompt = 'Give me a brief summary of my projects, their current status, and any that need attention.';
        break;
      case 'workload':
        prompt = 'Analyze my current workload across tasks and projects. Are there any concerns about capacity or deadlines?';
        break;
      default:
        prompt = 'Give me a quick overview of my work - tasks, projects, and any items that need attention.';
    }

    const response = await AIChatService.chatWithTools(
      [{ role: 'user', content: prompt }],
      READ_ONLY_TOOLS,
      toolExecutor,
      []
    );

    res.json({
      summary: response.content,
      type
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Summarization failed'
    });
  }
});

export default router;
