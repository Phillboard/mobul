/**
 * AIAssistantPanel Component
 * 
 * Clean AI chat panel with:
 * - Reference image upload (collapsible)
 * - Introduction/helper text
 * - Quick action buttons with background presets
 * - Chat input with Generate button
 * - Chat history (when messages exist)
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Sparkles, Send, Loader2, Trash2, ChevronDown, ImageIcon } from 'lucide-react';
import { QuickActions } from './QuickActions';
import { ReferenceUploader } from './ReferenceUploader';
import type { ChatMessage, ReferenceImageState, ReferenceAnalysis } from '../types/designer';

export interface AIAssistantPanelProps {
  /** Chat messages */
  messages: ChatMessage[];
  /** Whether AI is currently generating */
  isGenerating: boolean;
  /** Error message if any */
  error: string | null;
  /** Callback to send a message */
  onSendMessage: (message: string) => void;
  /** Callback to clear conversation */
  onClearConversation: () => void;
  
  // Reference image props
  /** Reference image state */
  referenceImage?: ReferenceImageState;
  /** Callback when reference file is selected */
  onReferenceSelect?: (file: File) => Promise<void>;
  /** Callback to generate from reference analysis */
  onGenerateFromReference?: (analysis: ReferenceAnalysis) => Promise<void>;
  /** Callback to clear reference image */
  onClearReference?: () => void;
  
  // Direct background generation (for quick action buttons)
  /** Callback for direct background generation */
  onGenerateBackground?: (prompt: string) => Promise<void>;
  
  /** Optional className */
  className?: string;
}

export function AIAssistantPanel({
  messages,
  isGenerating,
  error,
  onSendMessage,
  onClearConversation,
  referenceImage,
  onReferenceSelect,
  onGenerateFromReference,
  onClearReference,
  onGenerateBackground,
  className = '',
}: AIAssistantPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-expand reference section when image is loaded
  useEffect(() => {
    if (referenceImage?.analysis) {
      setReferenceOpen(true);
    }
  }, [referenceImage?.analysis]);

  const handleSend = () => {
    let message = inputValue.trim();
    if (!message || isGenerating) return;

    // Add reference context if available
    if (referenceImage?.analysis) {
      message = `[Reference style: ${referenceImage.analysis.style}, mood: ${referenceImage.analysis.mood}] ${message}`;
    }

    console.log('[AIAssistantPanel] Sending message:', message);
    onSendMessage(message);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    console.log('[AIAssistantPanel] Quick action triggered:', prompt);
    onSendMessage(prompt);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4">
          {!hasMessages ? (
            // Empty state - show intro and quick actions
            <>
              {/* AI Assistant Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-foreground">AI Design Assistant</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Describe your mail piece and I'll help you create a stunning design. 
                  Try "Create a postcard for a summer sale" to get started.
                </p>
              </div>

              {/* Reference Image Upload - Collapsible */}
              {referenceImage && onReferenceSelect && onGenerateFromReference && onClearReference && (
                <>
                  <Collapsible open={referenceOpen} onOpenChange={setReferenceOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors">
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Reference Postcard</span>
                        {referenceImage.analysis && (
                          <Badge variant="secondary" className="text-xs">Loaded</Badge>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${referenceOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <ReferenceUploader
                        referenceImage={referenceImage}
                        onFileSelect={onReferenceSelect}
                        onGenerateSimilar={onGenerateFromReference}
                        onClear={onClearReference}
                        isGenerating={isGenerating}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="border-t my-4" />
                </>
              )}

              {/* Quick Actions */}
              <QuickActions
                onAction={handleQuickAction}
                onGenerateBackground={onGenerateBackground}
                isLoading={isGenerating}
              />
            </>
          ) : (
            // Chat history
            <div className="space-y-4">
              {/* Header with clear button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">AI Design Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearConversation}
                  disabled={isGenerating}
                  className="h-7 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isGenerating && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Designing...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !isGenerating && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Reference and Quick actions below chat */}
              <div className="pt-4 border-t space-y-4">
                {/* Reference Image Upload - Collapsible */}
                {referenceImage && onReferenceSelect && onGenerateFromReference && onClearReference && (
                  <Collapsible open={referenceOpen} onOpenChange={setReferenceOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors">
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Reference Postcard</span>
                        {referenceImage.analysis && (
                          <Badge variant="secondary" className="text-xs">Loaded</Badge>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${referenceOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <ReferenceUploader
                        referenceImage={referenceImage}
                        onFileSelect={onReferenceSelect}
                        onGenerateSimilar={onGenerateFromReference}
                        onClear={onClearReference}
                        isGenerating={isGenerating}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <QuickActions
                  onAction={handleQuickAction}
                  onGenerateBackground={onGenerateBackground}
                  isLoading={isGenerating}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t p-4 bg-background">
        <div className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create..."
            disabled={isGenerating}
            className="min-h-[60px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

