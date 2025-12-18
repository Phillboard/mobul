/**
 * AILandingPageChat Component
 * 
 * The primary interface for AI landing page generation.
 * Features conversational UI, template buttons, and reference image upload.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Sparkles, 
  ImagePlus, 
  Trash2, 
  RefreshCw, 
  Loader2,
  Bot,
  User,
  Wand2,
  Palette,
  LayoutTemplate,
  FormInput,
  MessageSquareQuote,
  Moon,
  Sun,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/utils';
import type { ChatMessage, ElementContext, Template } from '../types';

// ============================================================================
// Quick Action Suggestions
// ============================================================================

const QUICK_SUGGESTIONS = [
  { icon: FormInput, label: 'Add contact form', prompt: 'Add a contact form section with name, email, and message fields' },
  { icon: MessageSquareQuote, label: 'Add testimonials', prompt: 'Add a testimonials section with 3 customer reviews' },
  { icon: LayoutTemplate, label: 'Add features grid', prompt: 'Add a features section with a 3-column grid of feature cards' },
  { icon: Palette, label: 'Change colors', prompt: 'Change the color scheme to ' },
  { icon: Moon, label: 'Dark theme', prompt: 'Convert the entire page to a dark theme with appropriate text colors' },
  { icon: Sun, label: 'Light theme', prompt: 'Convert the entire page to a light/white theme' },
];

// ============================================================================
// Template Starters
// ============================================================================

const TEMPLATE_STARTERS: Template[] = [
  {
    id: 'saas-product',
    name: 'SaaS Product Page',
    description: 'Modern product page with hero, features, pricing',
    category: 'saas',
    thumbnail: '',
    prompt: 'Create a modern SaaS product landing page with a hero section featuring a headline about productivity software, a subheadline with value proposition, a CTA button, a features section with 4 feature cards in a grid, a pricing section with 3 tiers (Basic, Pro, Enterprise), and a footer with links.',
    tags: ['saas', 'product', 'pricing'],
    isPopular: true,
  },
  {
    id: 'lead-gen',
    name: 'Lead Generation',
    description: 'Capture leads with compelling offer',
    category: 'lead-gen',
    thumbnail: '',
    prompt: 'Create a lead generation landing page with a compelling headline about a free guide or resource, bullet points listing benefits, a lead capture form with name, email, and phone fields, social proof section with stats, and a FAQ section.',
    tags: ['lead-gen', 'form', 'conversion'],
    isPopular: true,
  },
  {
    id: 'gift-card-redemption',
    name: 'Gift Card Redemption',
    description: 'Branded gift card claim page',
    category: 'gift-card',
    thumbnail: '',
    prompt: 'Create a gift card redemption landing page with a celebratory hero showing a gift card graphic, a form to enter redemption code, instructions on how to use the gift card, a support contact section, and branded footer.',
    tags: ['gift-card', 'redemption', 'form'],
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Event signup with agenda and speakers',
    category: 'event',
    thumbnail: '',
    prompt: 'Create an event registration landing page for a business conference with event date/time/location, agenda timeline, 3 speaker profiles with photos and bios, registration form with name, email, company fields, and a countdown timer to the event.',
    tags: ['event', 'registration', 'conference'],
  },
  {
    id: 'thank-you',
    name: 'Thank You Page',
    description: 'Post-conversion confirmation',
    category: 'thank-you',
    thumbnail: '',
    prompt: 'Create a thank you page with a success message, next steps instructions, a download button for any promised content, social sharing buttons, and links to related resources or products.',
    tags: ['thank-you', 'confirmation', 'conversion'],
  },
  {
    id: 'service-business',
    name: 'Service Business',
    description: 'Local service provider page',
    category: 'service',
    thumbnail: '',
    prompt: 'Create a landing page for a local service business (like plumbing, landscaping, or cleaning) with a hero section featuring a strong headline, service areas list, customer testimonials, before/after gallery placeholder, a contact form, and business hours.',
    tags: ['service', 'local', 'business'],
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface AILandingPageChatProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  selectedElement: ElementContext | null;
  hasContent: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onGenerateFromTemplate: (template: Template) => Promise<void>;
  onClearChat: () => void;
  onImageUpload?: (file: File) => Promise<void>;
  className?: string;
}

// ============================================================================
// Message Component
// ============================================================================

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isError = message.metadata?.error;

  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-lg',
      isUser ? 'bg-primary/5' : isError ? 'bg-destructive/10' : 'bg-muted/50'
    )}>
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary text-primary-foreground' : isError ? 'bg-destructive text-destructive-foreground' : 'bg-blue-500 text-white'
      )}>
        {isUser ? <User className="h-4 w-4" /> : isError ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-1">
        <p className={cn(
          'text-sm',
          isError && 'text-destructive'
        )}>
          {message.content}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{message.timestamp.toLocaleTimeString()}</span>
          {message.metadata?.tokensUsed && (
            <Badge variant="outline" className="text-[10px] px-1">
              {message.metadata.tokensUsed} tokens
            </Badge>
          )}
          {message.metadata?.changesMade && message.metadata.changesMade.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1">
              {message.metadata.changesMade.length} changes
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AILandingPageChat({
  messages,
  isGenerating,
  selectedElement,
  hasContent,
  onSendMessage,
  onGenerateFromTemplate,
  onClearChat,
  onImageUpload,
  className,
}: AILandingPageChatProps) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-populate input when element is selected
  useEffect(() => {
    if (selectedElement) {
      const contextText = selectedElement.textContent 
        ? `the ${selectedElement.tagName.toLowerCase()} that says "${selectedElement.textContent.substring(0, 30)}${selectedElement.textContent.length > 30 ? '...' : ''}"`
        : `the ${selectedElement.tagName.toLowerCase()} element`;
      setInput(`Edit ${contextText}: `);
      textareaRef.current?.focus();
    }
  }, [selectedElement]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isGenerating) return;
    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  }, [input, isGenerating, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuickSuggestion = useCallback((prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  }, []);

  const handleTemplateClick = useCallback(async (template: Template) => {
    await onGenerateFromTemplate(template);
  }, [onGenerateFromTemplate]);

  // Drag and drop for image upload
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/') && onImageUpload) {
      await onImageUpload(file);
    }
  }, [onImageUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      await onImageUpload(file);
    }
  }, [onImageUpload]);

  return (
    <div 
      className={cn('h-full flex flex-col', className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Design Assistant</h2>
              <p className="text-xs text-muted-foreground">Describe your vision</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClearChat}
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area or Template Gallery */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && !hasContent ? (
            <>
              {/* Welcome Message */}
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Wand2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Create Your Landing Page</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Describe what you want in plain English, or start with a template below.
                </p>
              </div>

              {/* Template Gallery */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Start with a template
                </h4>
                <div className="grid gap-2">
                  {TEMPLATE_STARTERS.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      disabled={isGenerating}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-all',
                        'hover:border-primary hover:bg-primary/5',
                        'disabled:opacity-50 disabled:pointer-events-none',
                        template.isPopular && 'border-primary/30 bg-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{template.name}</span>
                        {template.isPopular && (
                          <Badge variant="secondary" className="text-[10px]">Popular</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Example Prompts */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Or try these examples:</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="cursor-pointer hover:text-foreground" onClick={() => setInput('Create a minimalist landing page for a coffee subscription service with earthy colors')}>
                    "Create a minimalist landing page for a coffee subscription service..."
                  </p>
                  <p className="cursor-pointer hover:text-foreground" onClick={() => setInput('Build a bold, high-energy landing page for a fitness app with a free trial offer')}>
                    "Build a bold, high-energy landing page for a fitness app..."
                  </p>
                  <p className="cursor-pointer hover:text-foreground" onClick={() => setInput('Design a professional landing page for a B2B accounting software')}>
                    "Design a professional landing page for B2B accounting software..."
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Chat Messages */}
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))}

              {/* Loading State */}
              {isGenerating && (
                <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Generating your landing page...
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Quick Suggestions (only when there's content) */}
      {hasContent && !isGenerating && (
        <div className="flex-shrink-0 px-4 py-2 border-t">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {QUICK_SUGGESTIONS.slice(0, 4).map((suggestion, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="flex-shrink-0 text-xs h-7"
                onClick={() => handleQuickSuggestion(suggestion.prompt)}
              >
                <suggestion.icon className="h-3 w-3 mr-1" />
                {suggestion.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={cn(
        'flex-shrink-0 p-4 border-t',
        isDragging && 'ring-2 ring-primary ring-inset bg-primary/5'
      )}>
        {isDragging ? (
          <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">
            <ImagePlus className="h-5 w-5 mr-2" />
            Drop image to analyze design
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder={hasContent 
                ? "Describe what you'd like to change..." 
                : "Describe your landing page..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {onImageUpload && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      title="Upload reference image"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">{hasContent ? 'Update' : 'Generate'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { TEMPLATE_STARTERS };
