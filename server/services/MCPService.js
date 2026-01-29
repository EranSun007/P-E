/**
 * MCPService - MCP Protocol Client for Knowledge Base Integration
 *
 * Handles communication with external MCP server using JSON-RPC 2.0 protocol.
 * Provides semantic code search, documentation search, insight storage, and repository statistics.
 *
 * Features:
 * - Session lifecycle management with automatic re-initialization
 * - JSON-RPC 2.0 tool calling
 * - Session expiry handling (404 auto-retry)
 * - Health monitoring
 */

class MCPService {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || 'https://knowledge-base-mcp-server.cfapps.eu01-canary.hana.ondemand.com';
    this.session = null; // { sessionId, initializedAt }
    this.requestId = 0; // Incrementing JSON-RPC request ID
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Ensure a valid session exists (lazy initialization)
   * @returns {Promise<string>} Session ID
   */
  async _ensureSession() {
    if (!this.session) {
      await this._initialize();
    }
    return this.session.sessionId;
  }

  /**
   * Initialize MCP session with handshake
   * @returns {Promise<string>} Session ID
   */
  async _initialize() {
    try {
      // Step 1: Send initialize request
      const initResponse = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.requestId,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: {
              name: 'pe-manager',
              version: '1.5.0'
            }
          }
        })
      });

      if (!initResponse.ok) {
        throw new Error(`MCP initialization failed: ${initResponse.status}`);
      }

      // Extract session ID from header
      const sessionId = initResponse.headers.get('Mcp-Session-Id');
      if (!sessionId) {
        throw new Error('MCP server did not return session ID');
      }

      // Parse response and check for errors
      const initResult = await initResponse.json();
      if (initResult.error) {
        throw new Error(`MCP initialization error: ${initResult.error.message}`);
      }

      // Step 2: Send notifications/initialized (no id field - it's a notification)
      await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Mcp-Session-Id': sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        })
      });

      // Store session
      this.session = {
        sessionId,
        initializedAt: Date.now()
      };

      console.log('MCP session initialized:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('MCP initialization error:', error);
      throw new Error(`Failed to initialize MCP session: ${error.message}`);
    }
  }

  /**
   * Call an MCP tool using JSON-RPC 2.0
   * @param {string} toolName - Name of the tool to call
   * @param {object} args - Tool arguments
   * @param {boolean} retryOnSessionExpiry - Whether to retry once on 404
   * @returns {Promise<object>} Tool result
   */
  async _callTool(toolName, args, retryOnSessionExpiry = true) {
    try {
      // Ensure we have a valid session
      const sessionId = await this._ensureSession();

      // Make the tool call
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Mcp-Session-Id': sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.requestId,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        })
      });

      // Handle session expiry (404) with automatic retry
      if (response.status === 404 && retryOnSessionExpiry) {
        console.log('MCP session expired, re-initializing...');
        this.session = null;
        return this._callTool(toolName, args, false); // Retry once
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.status}`);
      }

      // Parse JSON-RPC response
      const result = await response.json();

      // Check for JSON-RPC error
      if (result.error) {
        throw new Error(`MCP tool error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      console.error(`MCP tool call error (${toolName}):`, error);
      throw new Error(`Failed to call MCP tool ${toolName}: ${error.message}`);
    }
  }

  /**
   * Parse tool result content
   * @param {object} result - Tool result from JSON-RPC response
   * @returns {object} Parsed result
   */
  _parseToolResult(result) {
    try {
      // Check if result is an error
      if (result.isError) {
        const textContent = result.content?.find(c => c.type === 'text');
        throw new Error(textContent?.text || 'Unknown MCP tool error');
      }

      // Find text content
      const textContent = result.content?.find(c => c.type === 'text');
      if (!textContent) {
        return result.content || result;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(textContent.text);
      } catch {
        // If not JSON, return raw text
        return textContent.text;
      }
    } catch (error) {
      throw new Error(`Failed to parse MCP tool result: ${error.message}`);
    }
  }

  // ============================================
  // Public Tool Methods
  // ============================================

  /**
   * Search codebase with semantic search
   * @param {object} options - Search options
   * @param {string} options.query - Search query (required)
   * @param {number} options.limit - Max results
   * @param {number} options.threshold - Similarity threshold
   * @param {string} options.repoName - Filter by repository
   * @param {string} options.language - Filter by language
   * @param {string} options.artifactType - Filter by artifact type
   * @param {string} options.ownership - Filter by ownership
   * @returns {Promise<object>} Search results
   */
  async searchCode(options) {
    try {
      if (!options.query) {
        throw new Error('query parameter is required');
      }

      const result = await this._callTool('consult_code_base', options);
      return this._parseToolResult(result);
    } catch (error) {
      throw new Error(`MCP searchCode failed: ${error.message}`);
    }
  }

  /**
   * Search documentation with semantic search
   * @param {object} options - Search options
   * @param {string} options.query - Search query (required)
   * @param {number} options.limit - Max results
   * @param {number} options.threshold - Similarity threshold
   * @param {string} options.domain - Filter by domain
   * @param {string} options.category - Filter by category
   * @returns {Promise<object>} Search results
   */
  async searchDocs(options) {
    try {
      if (!options.query) {
        throw new Error('query parameter is required');
      }

      const result = await this._callTool('consult_documentation', options);
      return this._parseToolResult(result);
    } catch (error) {
      throw new Error(`MCP searchDocs failed: ${error.message}`);
    }
  }

  /**
   * Store an insight in the knowledge base
   * @param {object} options - Insight options
   * @param {string} options.insight - Insight text (required)
   * @param {string} options.category - Insight category
   * @param {Array<string>} options.tags - Tags
   * @param {Array<string>} options.relatedFiles - Related file paths
   * @returns {Promise<object>} Storage confirmation
   */
  async storeInsight(options) {
    try {
      if (!options.insight) {
        throw new Error('insight parameter is required');
      }

      const result = await this._callTool('store_insight', options);
      return this._parseToolResult(result);
    } catch (error) {
      throw new Error(`MCP storeInsight failed: ${error.message}`);
    }
  }

  /**
   * Get repository statistics
   * @param {object} options - Stats options
   * @param {string} options.repoName - Filter by repository
   * @param {string} options.statsType - Type of stats (default: 'overall')
   * @returns {Promise<object>} Repository statistics
   */
  async getStats(options = {}) {
    try {
      const result = await this._callTool('get_repository_stats', {
        repoName: options.repoName,
        statsType: options.statsType || 'overall'
      });
      return this._parseToolResult(result);
    } catch (error) {
      throw new Error(`MCP getStats failed: ${error.message}`);
    }
  }

  /**
   * Health check for MCP server
   * @returns {Promise<object>} Health status
   */
  async getHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);

      if (response.ok) {
        return {
          healthy: true,
          url: this.baseUrl
        };
      }

      return {
        healthy: false,
        error: response.status
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export default new MCPService();
