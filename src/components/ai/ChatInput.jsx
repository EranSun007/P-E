/**
 * Chat Input Component
 * Text input with send button for chat messages
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatInput({
  onSend,
  onCancel,
  disabled = false,
  isLoading = false,
  isStreaming = false,
  isProductMode = false,
  placeholder = 'Ask me anything about your tasks, projects, or team...'
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex gap-2 items-end p-4 border-t",
        isProductMode
          ? "bg-gray-900 border-gray-700"
          : "bg-white border-gray-200"
      )}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={cn(
          "min-h-[44px] max-h-[150px] resize-none flex-1",
          isProductMode && "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
        )}
        rows={1}
      />

      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={onCancel}
          className="shrink-0"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || disabled || isLoading}
          className={cn(
            "shrink-0",
            isProductMode && "bg-purple-600 hover:bg-purple-700"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      )}
    </form>
  );
}

export default ChatInput;
