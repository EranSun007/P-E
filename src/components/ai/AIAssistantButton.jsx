/**
 * AI Assistant Button Component
 * Floating action button to open the AI chat panel
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAI } from '@/contexts/AIContext';

export function AIAssistantButton({ className }) {
  const { toggleChat, isOpen, isLoading, isAvailable } = useAI();

  // Don't render if AI is not available
  if (isAvailable === false) {
    return null;
  }

  return (
    <Button
      onClick={toggleChat}
      className={cn(
        'fixed bottom-6 right-6 z-30',
        'w-14 h-14 rounded-full shadow-lg',
        'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
        'transition-all duration-200',
        isOpen && 'scale-0 opacity-0',
        className
      )}
      size="icon"
      title="Open AI Assistant"
    >
      <Sparkles className={cn(
        'h-6 w-6 text-white',
        isLoading && 'animate-pulse'
      )} />
    </Button>
  );
}

export default AIAssistantButton;
