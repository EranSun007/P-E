/**
 * AI Client
 * Frontend API client for AI chat and agentic capabilities
 */

import AuthService from '../services/authService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Helper function to make authenticated requests
 */
async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = AuthService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} - ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  return response;
}

/**
 * AI Client API
 */
export const aiClient = {
  /**
   * Check if AI service is available
   * @returns {Promise<Object>} Status object with availability info
   */
  async getStatus() {
    const response = await fetchWithAuth(`${API_BASE_URL}/ai/status`);
    return response.json();
  },

  /**
   * Get list of available tools
   * @returns {Promise<Object>} Object with tools array
   */
  async getTools() {
    const response = await fetchWithAuth(`${API_BASE_URL}/ai/tools`);
    return response.json();
  },

  /**
   * Send a chat message and get a response
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Optional parameters
   * @param {Array} options.history - Previous message history
   * @param {boolean} options.useTools - Whether to enable tools (default: true)
   * @param {Object} options.pageContext - Current page context for AI
   * @returns {Promise<Object>} Chat response
   */
  async chat(messages, options = {}) {
    const { history = [], useTools = true, pageContext = null } = options;

    const response = await fetchWithAuth(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({
        messages,
        history,
        useTools,
        pageContext
      }),
    });

    return response.json();
  },

  /**
   * Stream a chat response
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Optional parameters
   * @param {Function} onChunk - Callback for each chunk
   * @param {Function} onDone - Callback when complete
   * @param {Function} onError - Callback for errors
   * @param {AbortSignal} signal - Optional abort signal
   */
  async streamChat(messages, options = {}) {
    const { history = [], onChunk, onDone, onError, signal } = options;

    try {
      const token = AuthService.getToken();
      const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          messages,
          history
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              if (onDone) onDone();
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content' && onChunk) {
                onChunk(parsed.content);
              } else if (parsed.type === 'done' && onDone) {
                onDone(parsed);
              } else if (parsed.type === 'error' && onError) {
                onError(new Error(parsed.message));
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  },

  /**
   * Execute a tool directly (for testing)
   * @param {string} tool - Tool name
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool result
   */
  async executeTool(tool, args = {}) {
    const response = await fetchWithAuth(`${API_BASE_URL}/ai/execute-tool`, {
      method: 'POST',
      body: JSON.stringify({ tool, args }),
    });
    return response.json();
  },

  /**
   * Get a quick summary
   * @param {string} type - Summary type: 'tasks', 'projects', 'workload'
   * @returns {Promise<Object>} Summary response
   */
  async summarize(type = 'tasks') {
    const response = await fetchWithAuth(`${API_BASE_URL}/ai/summarize`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    return response.json();
  }
};

export default aiClient;
