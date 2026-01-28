/**
 * AI Context
 * React context for managing AI chat state and interactions
 */

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { aiClient } from '@/api/aiClient';

const AIContext = createContext(null);

// Staleness threshold in milliseconds (5 minutes)
const STALENESS_THRESHOLD = 5 * 60 * 1000;

/**
 * AI Provider Component
 */
export function AIProvider({ children }) {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  // Page context state
  const [pageContext, setPageContext] = useState(null);
  const [contextTimestamp, setContextTimestamp] = useState(null);
  const [contextExpanded, setContextExpanded] = useState(false);

  // Abort controller for cancelling requests
  const abortControllerRef = useRef(null);

  /**
   * Check if AI service is available
   */
  const checkAvailability = useCallback(async () => {
    try {
      const status = await aiClient.getStatus();
      setIsAvailable(status.available);
      return status.available;
    } catch (err) {
      console.error('Failed to check AI availability:', err);
      setIsAvailable(false);
      return false;
    }
  }, []);

  /**
   * Update page context
   */
  const updatePageContext = useCallback((context) => {
    setPageContext(context);
    setContextTimestamp(new Date().toISOString());
  }, []);

  /**
   * Clear page context
   */
  const clearPageContext = useCallback(() => {
    setPageContext(null);
    setContextTimestamp(null);
  }, []);

  /**
   * Toggle context expansion in UI
   */
  const toggleContextExpanded = useCallback(() => {
    setContextExpanded(prev => !prev);
  }, []);

  /**
   * Check if context is stale
   */
  const isContextStale = useMemo(() => {
    if (!contextTimestamp) return false;
    const contextTime = new Date(contextTimestamp).getTime();
    return (Date.now() - contextTime) > STALENESS_THRESHOLD;
  }, [contextTimestamp]);

  /**
   * Get staleness in minutes
   */
  const contextStalenessMinutes = useMemo(() => {
    if (!contextTimestamp) return 0;
    const contextTime = new Date(contextTimestamp).getTime();
    return Math.floor((Date.now() - contextTime) / (60 * 1000));
  }, [contextTimestamp]);

  /**
   * Send a message and get a response (non-streaming)
   */
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const userMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiClient.chat(
        [userMessage],
        {
          history: messages,
          useTools: options.useTools !== false,
          pageContext: pageContext ? {
            summary: pageContext.summary,
            page: pageContext.page,
            timestamp: contextTimestamp,
            selection: pageContext.selection
          } : null
        }
      );

      const assistantMessage = { role: 'assistant', content: response.content };
      setMessages([...newMessages, assistantMessage]);

      return response;
    } catch (err) {
      console.error('AI chat error:', err);
      setError(err.message || 'Failed to get AI response');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [messages, pageContext, contextTimestamp]);

  /**
   * Send a message with streaming response
   */
  const sendMessageStreaming = useCallback(async (content, options = {}) => {
    if (!content.trim()) return;

    const userMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Add placeholder for assistant message
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    try {
      await aiClient.streamChat(
        [userMessage],
        {
          history: messages,
          signal: abortControllerRef.current.signal,
          onChunk: (chunk) => {
            setMessages(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + chunk
              };
              return updated;
            });
          },
          onDone: (metadata) => {
            setIsLoading(false);
            setIsStreaming(false);
            if (options.onComplete) {
              options.onComplete(metadata);
            }
          },
          onError: (err) => {
            setError(err.message || 'Streaming failed');
            setIsLoading(false);
            setIsStreaming(false);
          }
        }
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('AI stream error:', err);
        setError(err.message || 'Failed to stream AI response');
      }
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [messages]);

  /**
   * Cancel the current streaming request
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Toggle chat panel open/closed
   */
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  /**
   * Open chat panel
   */
  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close chat panel
   */
  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Get a quick summary
   */
  const getSummary = useCallback(async (type = 'tasks') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiClient.summarize(type);
      return response.summary;
    } catch (err) {
      console.error('Summarize error:', err);
      setError(err.message || 'Failed to get summary');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Send a predefined quick action
   */
  const quickAction = useCallback(async (action) => {
    const prompts = {
      summarize_tasks: 'Give me a quick summary of my tasks, highlighting anything urgent or overdue.',
      summarize_projects: 'What\'s the status of my projects? Any that need attention?',
      analyze_workload: 'Analyze my current workload. Am I overloaded? What should I prioritize?',
      whats_next: 'Based on my tasks and deadlines, what should I focus on next?',
      weekly_review: 'Give me a weekly review of my completed tasks and upcoming deadlines.'
    };

    const prompt = prompts[action] || action;
    return sendMessageStreaming(prompt);
  }, [sendMessageStreaming]);

  const value = {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    isOpen,
    isAvailable,

    // Page context state
    pageContext,
    contextTimestamp,
    contextExpanded,
    isContextStale,
    contextStalenessMinutes,

    // Actions
    sendMessage,
    sendMessageStreaming,
    cancelStreaming,
    clearChat,
    toggleChat,
    openChat,
    closeChat,
    checkAvailability,
    getSummary,
    quickAction,

    // Page context actions
    updatePageContext,
    clearPageContext,
    toggleContextExpanded,

    // Setters for external control
    setMessages,
    setError,
    setContextExpanded
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}

/**
 * Hook to use AI context
 */
export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

export default AIContext;
