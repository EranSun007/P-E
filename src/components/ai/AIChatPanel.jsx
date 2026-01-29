/**
 * AI Chat Panel Component
 * Slide-out chat panel for AI assistant
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Trash2, Sparkles, ListTodo, Folders, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAI } from '@/contexts/AIContext';
import { useAppMode } from '@/contexts/AppModeContext.jsx';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ContextIndicator from './ContextIndicator';
import NavigationPrompt from './NavigationPrompt';

export function AIChatPanel() {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    isOpen,
    closeChat,
    sendMessageStreaming,
    cancelStreaming,
    clearChat,
    quickAction,
    searchKnowledgeBase,
    // Page context
    pageContext,
    contextTimestamp,
    contextExpanded,
    isContextStale,
    contextStalenessMinutes,
    toggleContextExpanded,
    updatePageContext
  } = useAI();

  const { isProductMode } = useAppMode();
  const location = useLocation();
  const scrollRef = useRef(null);

  // Track navigation changes
  const [previousPath, setPreviousPath] = useState(location.pathname);
  const [showNavigationPrompt, setShowNavigationPrompt] = useState(false);

  // Detect navigation changes when panel is open
  useEffect(() => {
    if (isOpen && previousPath !== location.pathname && pageContext) {
      setShowNavigationPrompt(true);
    }
    setPreviousPath(location.pathname);
  }, [location.pathname, isOpen, previousPath, pageContext]);

  // Handle refresh context from navigation prompt
  const handleRefreshContext = () => {
    setShowNavigationPrompt(false);
    // The page will re-register its context when it mounts
    // We just need to trigger the refresh - pages listen to this
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ai-context-refresh'));
    }
  };

  // Handle dismiss navigation prompt
  const handleDismissNavigationPrompt = () => {
    setShowNavigationPrompt(false);
  };

  // Handle context refresh from indicator
  const handleContextRefresh = () => {
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('ai-context-refresh'));
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Quick action buttons
  const quickActions = [
    { id: 'summarize_tasks', label: 'Summarize Tasks', icon: ListTodo },
    { id: 'summarize_projects', label: 'Project Status', icon: Folders },
    { id: 'analyze_workload', label: 'Analyze Workload', icon: Users },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={closeChat}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] shadow-2xl z-50',
          'flex flex-col',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          isProductMode ? 'bg-gray-900' : 'bg-white'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-white/80 hover:text-white hover:bg-white/10"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Context Indicator */}
        <ContextIndicator
          pageContext={pageContext}
          contextTimestamp={contextTimestamp}
          isStale={isContextStale}
          stalenessMinutes={contextStalenessMinutes}
          expanded={contextExpanded}
          onToggleExpanded={toggleContextExpanded}
          onRefresh={handleContextRefresh}
          className={isProductMode ? 'bg-gray-800/50 border-gray-700' : ''}
        />

        {/* Navigation Change Prompt */}
        {showNavigationPrompt && (
          <NavigationPrompt
            currentPath={location.pathname}
            onRefresh={handleRefreshContext}
            onDismiss={handleDismissNavigationPrompt}
          />
        )}

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1">
          {messages.length === 0 ? (
            <div className="p-6 text-center">
              <div className={cn(
                "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
                isProductMode
                  ? "bg-gradient-to-br from-purple-900 to-indigo-900"
                  : "bg-gradient-to-br from-indigo-100 to-purple-100"
              )}>
                <Sparkles className={cn(
                  "h-8 w-8",
                  isProductMode ? "text-purple-400" : "text-indigo-600"
                )} />
              </div>
              <h3 className={cn(
                "font-semibold mb-2",
                isProductMode ? "text-white" : "text-gray-900"
              )}>
                Hi! I'm your AI Assistant
              </h3>
              <p className={cn(
                "text-sm mb-6",
                isProductMode ? "text-gray-400" : "text-gray-500"
              )}>
                I can help you manage tasks, analyze projects, and keep track of your team.
                Ask me anything or try a quick action below.
              </p>

              {/* Quick Actions */}
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => quickAction(action.id)}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left disabled:opacity-50",
                      isProductMode
                        ? "border-gray-700 hover:bg-gray-800 bg-gray-800/50"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <action.icon className={cn(
                      "h-5 w-5",
                      isProductMode ? "text-purple-400" : "text-indigo-600"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      isProductMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={cn(
              "divide-y",
              isProductMode ? "divide-gray-800" : "divide-gray-100"
            )}>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  isProductMode={isProductMode}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Error display */}
        {error && (
          <div className={cn(
            "px-4 py-2 border-t",
            isProductMode
              ? "bg-red-900/30 border-red-800"
              : "bg-red-50 border-red-100"
          )}>
            <p className={cn(
              "text-sm",
              isProductMode ? "text-red-400" : "text-red-600"
            )}>{error}</p>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={sendMessageStreaming}
          onCancel={cancelStreaming}
          onSearchCommand={searchKnowledgeBase}
          isLoading={isLoading}
          isStreaming={isStreaming}
          isProductMode={isProductMode}
        />
      </div>
    </>
  );
}

export default AIChatPanel;
