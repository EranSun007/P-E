/**
 * Chat Message Component
 * Displays individual chat messages from user or assistant
 */

import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function ChatMessage({ message, isStreaming = false, isProductMode = false }) {
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

export default ChatMessage;
