/**
 * Chat Message Component
 * Displays individual chat messages from user or assistant
 */

import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SearchResultBlock } from './SearchResultBlock';

export function ChatMessage({ message, isStreaming = false, isProductMode = false }) {
  // Handle special message types
  if (message.type === 'search_result') {
    return (
      <SearchResultBlock
        query={message.query}
        codeResults={message.codeResults}
        docsResults={message.docsResults}
        isProductMode={isProductMode}
      />
    );
  }

  // Handle command messages (like /search query)
  if (message.type === 'command') {
    return (
      <div className={cn(
        'flex gap-3 p-4',
        isProductMode ? 'bg-gray-800' : 'bg-gray-50'
      )}>
        <Avatar className={cn(
          'h-8 w-8 shrink-0',
          isProductMode ? 'bg-indigo-900' : 'bg-indigo-100'
        )}>
          <AvatarFallback className={isProductMode ? 'text-indigo-400' : 'text-indigo-700'}>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-1 text-gray-500">You</p>
          <code className={cn(
            "text-sm px-2 py-1 rounded",
            isProductMode
              ? "bg-gray-700 text-purple-400"
              : "bg-gray-100 text-indigo-600"
          )}>
            {message.content}
          </code>
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser
          ? isProductMode ? 'bg-gray-800' : 'bg-gray-50'
          : isProductMode ? 'bg-gray-900' : 'bg-white'
      )}
    >
      <Avatar className={cn(
        'h-8 w-8 shrink-0',
        isUser
          ? isProductMode ? 'bg-indigo-900' : 'bg-indigo-100'
          : isProductMode ? 'bg-emerald-900' : 'bg-emerald-100'
      )}>
        <AvatarFallback className={cn(
          isUser
            ? isProductMode ? 'text-indigo-400' : 'text-indigo-700'
            : isProductMode ? 'text-emerald-400' : 'text-emerald-700'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-medium mb-1",
          isProductMode ? "text-gray-500" : "text-gray-500"
        )}>
          {isUser ? 'You' : 'AI Assistant'}
        </p>
        <div className={cn(
          "text-sm whitespace-pre-wrap break-words",
          isProductMode ? "text-gray-200" : "text-gray-900"
        )}>
          {message.content}
          {isStreaming && !isUser && (
            <span className={cn(
              "inline-block w-2 h-4 animate-pulse ml-0.5",
              isProductMode ? "bg-gray-500" : "bg-gray-400"
            )} />
          )}
        </div>
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string,
    content: PropTypes.string,
    type: PropTypes.string,
    query: PropTypes.string,
    codeResults: PropTypes.arrayOf(PropTypes.object),
    docsResults: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  isStreaming: PropTypes.bool,
  isProductMode: PropTypes.bool,
};

export default ChatMessage;
