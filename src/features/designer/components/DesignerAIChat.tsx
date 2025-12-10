/**
 * DesignerAIChat Component
 * 
 * AI conversation interface for design assistance.
 * Allows users to describe what they want and get design suggestions.
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  RotateCcw,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import type { ChatMessage, AISuggestion } from '../types/designer';
import { EXAMPLE_PROMPTS } from '../utils/aiPrompts';

export interface DesignerAIChatProps {
  /** Chat messages */
  messages: ChatMessage[];
  /** Whether AI is currently generating */
  isGenerating: boolean;
  /** Error message if any */
  error: string | null;
  /** Current suggestion waiting to be applied */
  currentSuggestion: AISuggestion | null;
  /** Designer type (for example prompts) */
  designerType: 'mail' | 'landing-page' | 'email';
  /** Callback to send a message */
  onSendMessage: (message: string) => void;
  /** Callback to apply suggestion */
  onApplySuggestion: (suggestion: AISuggestion) => void;
  /** Callback to reject suggestion */
  onRejectSuggestion: () => void;
  /** Callback to clear conversation */
  onClearConversation: () => void;
  /** Callback to retry last message */
  onRetry: () => void;
  /** Custom className */
  className?: string;
}

/**
 * AI chat interface component
 */
export function DesignerAIChat({
  messages,
  isGenerating,
  error,
  currentSuggestion,
  designerType,
  onSendMessage,
  onApplySuggestion,
  onRejectSuggestion,
  onClearConversation,
  onRetry,
  className = '',
}: DesignerAIChatProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when not generating
  useEffect(() => {
    if (!isGenerating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGenerating]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (!message || isGenerating) return;

    onSendMessage(message);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle example/suggestion click - sends message immediately
   */
  const handleExampleClick = (example: string) => {
    if (isGenerating) return;
    console.log('[DesignerAIChat] Quick suggestion clicked:', example);
    onSendMessage(example);
  };

  /**
   * Handle example hover - shows in input for editing if user prefers
   */
  const handleExampleHover = (example: string) => {
    // Could show preview, but for now just let click send directly
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">AI Design Assistant</h3>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearConversation}
            disabled={isGenerating}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h4 className="font-medium mb-2">Ask me to design anything!</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Describe what you want, and I'll create it for you.
              </p>
            </div>

            {/* Quick Actions - Click to execute immediately */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Click to try:
              </p>
              <div className="space-y-2">
                {EXAMPLE_PROMPTS[designerType].slice(0, 4).map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="w-full text-left text-sm p-3 rounded-lg border hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30 transition-colors cursor-pointer group"
                    disabled={isGenerating}
                  >
                    <span className="group-hover:text-purple-600">"{example}"</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                💡 Click any suggestion to apply it instantly
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Current Suggestion */}
      {currentSuggestion && !isGenerating && (
        <div className="p-4 border-t bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Ready to apply</p>
              <p className="text-xs text-muted-foreground mb-3">
                {currentSuggestion.explanation}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onApplySuggestion(currentSuggestion)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRejectSuggestion}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isGenerating && (
        <div className="p-4 border-t">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="ml-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to create..."
            disabled={isGenerating}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
            size="icon"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {messages.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact AI chat trigger button
 * Shows a floating button that opens the chat panel
 */
export function AIAssistantButton({
  onClick,
  hasUnreadSuggestion,
}: {
  onClick: () => void;
  hasUnreadSuggestion?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      className="relative bg-purple-600 hover:bg-purple-700 shadow-lg"
      size="lg"
    >
      <Sparkles className="h-5 w-5 mr-2" />
      AI Assistant
      {hasUnreadSuggestion && (
        <Badge
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500"
        >
          <span className="text-[10px]">!</span>
        </Badge>
      )}
    </Button>
  );
}

