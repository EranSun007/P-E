/**
 * Chat Input Component
 * Text input with send button for chat messages
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

// Known commands mapping
const KNOWN_COMMANDS = {
  '/search': true,
  '/help': true
};

/**
 * Parse command from input string
 * @param {string} input - User input
 * @returns {null|{error: string}|{command: string, args: string}}
 */
function parseCommand(input) {
  const commandPattern = /^(\/\w+)\s+(.*)$/;
  const match = input.match(commandPattern);

  if (!match) {
    // Check if it starts with / but has no args
    if (input.startsWith('/')) {
      const cmd = input.split(/\s+/)[0];
      if (!KNOWN_COMMANDS[cmd]) {
        return { error: `Unknown command: ${cmd}. Try /help` };
      }
      // Known command but no args
      return { error: `Command ${cmd} requires arguments` };
    }
    return null; // Not a command
  }

  const [, command, args] = match;

  // Check if command is known
  if (!KNOWN_COMMANDS[command]) {
    return { error: `Unknown command: ${command}. Try /help` };
  }

  return { command, args: args.trim() };
}

export function ChatInput({
  onSend,
  onCancel,
  onSearchCommand,
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
    if (!value.trim() || disabled || isLoading) {
      return;
    }

    const trimmedValue = value.trim();

    // Try to parse as command
    const parsed = parseCommand(trimmedValue);

    // Handle error (unknown command)
    if (parsed && parsed.error) {
      toast({
        title: 'Command Error',
        description: parsed.error,
        variant: 'destructive',
      });
      return;
    }

    // Handle /help command
    if (parsed && parsed.command === '/help') {
      toast({
        title: 'Available Commands',
        description: '/search [query] - Search the knowledge base\n/help - Show this help',
      });
      setValue('');
      return;
    }

    // Handle /search command
    if (parsed && parsed.command === '/search') {
      if (onSearchCommand) {
        onSearchCommand(parsed.args);
        setValue('');
      } else {
        toast({
          title: 'Search Not Available',
          description: 'Search command is not available in this context',
          variant: 'destructive',
        });
      }
      return;
    }

    // Normal message (not a command)
    onSend(trimmedValue);
    setValue('');
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
