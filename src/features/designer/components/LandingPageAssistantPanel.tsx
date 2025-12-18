/**
 * LandingPageAssistantPanel Component
 * 
 * AI Assistant panel specifically designed for landing page creation with:
 * - Web-focused background generation presets
 * - Section generation actions (hero, form, testimonials, etc.)
 * - General design assistance actions
 * - Chat interface with history
 * - Collapsible reference image upload
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
import {
  Sparkles,
  Send,
  Loader2,
  Trash2,
  ChevronDown,
  ImageIcon,
  Layout,
  FileInput,
  Quote,
  DollarSign,
  Grid3X3,
  Layers,
  Lightbulb,
  Palette,
  LayoutGrid,
  Globe,
  Blend,
  Users,
  Footprints,
} from 'lucide-react';
import type { ChatMessage, ReferenceImageState, ReferenceAnalysis } from '../types/designer';

/**
 * Web-focused background generation presets for landing pages
 */
export interface BackgroundPreset {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

export const LANDING_BG_PRESETS: BackgroundPreset[] = [
  {
    id: 'hero-gradient',
    label: 'Hero Gradient',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate a modern, professional hero section background with smooth gradient transitions. Rich colors flowing from deep purple to blue or warm coral to orange. Subtle geometric shapes or flowing abstract forms. No text, no logos. Perfect for overlaying headlines and CTAs.',
  },
  {
    id: 'product-showcase',
    label: 'Product',
    icon: <Layers className="h-4 w-4" />,
    prompt: 'Generate a clean, minimal product showcase background. Soft shadows, professional lighting, neutral tones with subtle gradients. Space for product images to pop. No text, no logos. Premium e-commerce aesthetic.',
  },
  {
    id: 'testimonial-bg',
    label: 'Testimonial',
    icon: <Quote className="h-4 w-4" />,
    prompt: 'Generate a soft, trustworthy background for testimonials section. Warm, inviting colors with subtle patterns. Think soft gradients, gentle waves, or light textures. No text, no faces. Creates a sense of trust and credibility.',
  },
  {
    id: 'pricing-bg',
    label: 'Pricing',
    icon: <DollarSign className="h-4 w-4" />,
    prompt: 'Generate a clean, professional background for a pricing section. Light to white gradient with subtle geometric patterns. Modern SaaS aesthetic. No text, no numbers. Professional and conversion-focused.',
  },
  {
    id: 'pattern-overlay',
    label: 'Pattern',
    icon: <Grid3X3 className="h-4 w-4" />,
    prompt: 'Generate a subtle geometric pattern background. Modern, minimal design with repeating shapes. Light opacity, works as overlay. No text. Think dot grids, subtle lines, or minimal geometric shapes.',
  },
  {
    id: 'form-bg',
    label: 'Form BG',
    icon: <FileInput className="h-4 w-4" />,
    prompt: 'Generate a clean, calming background for a form section. Light gradients, minimal distractions, professional feel. Soft blues, greens, or neutrals. No text. Creates focus on the form itself.',
  },
  {
    id: 'footer-bg',
    label: 'Footer',
    icon: <Footprints className="h-4 w-4" />,
    prompt: 'Generate a professional footer background. Dark gradient from deep navy/charcoal to black. Subtle texture or pattern. Modern, premium website feel. No text, no logos.',
  },
  {
    id: 'abstract-web',
    label: 'Abstract',
    icon: <Blend className="h-4 w-4" />,
    prompt: 'Generate a modern abstract web design background. Flowing shapes, gradients, and dynamic movement. Vibrant but professional colors. No text. Contemporary digital aesthetic perfect for tech landing pages.',
  },
];

/**
 * Section generation quick actions
 */
export interface SectionAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

export const SECTION_ACTIONS: SectionAction[] = [
  {
    id: 'gen-hero',
    label: 'Generate hero section',
    icon: <Layout className="h-4 w-4" />,
    prompt: 'Create a landing page hero section with: 1) Large compelling headline, 2) Subheadline explaining the value proposition, 3) Primary CTA button, 4) Hero image or illustration placeholder. Use professional spacing and visual hierarchy.',
  },
  {
    id: 'gen-form',
    label: 'Generate form section',
    icon: <FileInput className="h-4 w-4" />,
    prompt: 'Create a lead capture form section with: 1) Section headline, 2) Brief description of what they get, 3) Form fields (name, email, phone), 4) Submit button with compelling CTA text, 5) Privacy note. Clean, minimal design that converts.',
  },
  {
    id: 'gen-testimonials',
    label: 'Add testimonials',
    icon: <Quote className="h-4 w-4" />,
    prompt: 'Create a testimonials section with: 1) Section headline like "What Our Customers Say", 2) 3 testimonial cards with quote, name, and title placeholders, 3) Star ratings. Build trust and social proof.',
  },
  {
    id: 'gen-features',
    label: 'Add features grid',
    icon: <Grid3X3 className="h-4 w-4" />,
    prompt: 'Create a features section with: 1) Section headline, 2) 3-4 feature cards in a grid, 3) Each card has icon placeholder, title, and description. Highlight key benefits.',
  },
  {
    id: 'gen-pricing',
    label: 'Generate pricing',
    icon: <DollarSign className="h-4 w-4" />,
    prompt: 'Create a pricing section with: 1) Section headline, 2) 3 pricing tier cards (Basic, Pro, Enterprise), 3) Price placeholders, feature lists, and CTA buttons for each. Highlight recommended plan.',
  },
  {
    id: 'gen-footer',
    label: 'Generate footer',
    icon: <Layers className="h-4 w-4" />,
    prompt: 'Create a professional footer with: 1) Company logo placeholder, 2) Navigation links columns, 3) Social media icons, 4) Copyright text, 5) Privacy/Terms links. Clean, organized layout.',
  },
];

/**
 * Design assistance quick actions
 */
export const DESIGN_ACTIONS: SectionAction[] = [
  {
    id: 'generate-full',
    label: 'Generate full landing page',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate a complete high-converting landing page with: hero section (headline, subheadline, CTA), features section, testimonials, form section, and footer. Use professional design principles, clear visual hierarchy, and conversion-focused layout.',
  },
  {
    id: 'suggest-headlines',
    label: 'Suggest headlines',
    icon: <Lightbulb className="h-4 w-4" />,
    prompt: 'Suggest 3 compelling headlines for this landing page that will grab attention and drive conversions. Focus on value proposition and emotional appeal.',
  },
  {
    id: 'color-palette',
    label: 'Color palette',
    icon: <Palette className="h-4 w-4" />,
    prompt: 'Suggest a professional color palette for this landing page with primary, secondary, and accent colors that work well together. Include hex codes and usage recommendations.',
  },
  {
    id: 'layout-ideas',
    label: 'Layout ideas',
    icon: <LayoutGrid className="h-4 w-4" />,
    prompt: 'Suggest 3 different layout arrangements for this landing page considering visual hierarchy, conversion optimization, and mobile responsiveness.',
  },
];

export interface LandingPageAssistantPanelProps {
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
  
  // Reference image props (optional)
  /** Reference image state */
  referenceImage?: ReferenceImageState;
  /** Callback when reference file is selected */
  onReferenceSelect?: (file: File) => Promise<void>;
  /** Callback to generate from reference analysis */
  onGenerateFromReference?: (analysis: ReferenceAnalysis) => Promise<void>;
  /** Callback to clear reference image */
  onClearReference?: () => void;
  
  // Background generation
  /** Callback for direct background generation */
  onGenerateBackground?: (prompt: string) => Promise<void>;
  
  /** Optional className */
  className?: string;
}

export function LandingPageAssistantPanel({
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
}: LandingPageAssistantPanelProps) {
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

    console.log('[LandingPageAssistantPanel] Sending message:', message);
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
    console.log('[LandingPageAssistantPanel] Quick action triggered:', prompt);
    onSendMessage(prompt);
  };

  /**
   * Handle background preset click
   */
  const handleBackgroundClick = async (preset: BackgroundPreset) => {
    if (onGenerateBackground) {
      // Direct image generation
      await onGenerateBackground(preset.prompt);
    } else {
      // Fallback to sending through chat
      onSendMessage(preset.prompt);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex flex-col h-full bg-card ${className}`}>
      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4">
          {!hasMessages ? (
            // Empty state - show intro and quick actions
            <>
              {/* AI Assistant Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-foreground">AI Design Assistant</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Describe your landing page and I'll help you create a high-converting design.
                  Try "Create a landing page for a gift card promotion" to get started.
                </p>
              </div>

              {/* Reference Image Upload - Collapsible (if props provided) */}
              {referenceImage && onReferenceSelect && onGenerateFromReference && onClearReference && (
                <>
                  <Collapsible open={referenceOpen} onOpenChange={setReferenceOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors">
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Reference Design</span>
                        {referenceImage.analysis && (
                          <Badge variant="secondary" className="text-xs">Loaded</Badge>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${referenceOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="p-3 border rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                          Upload a reference landing page to match its style.
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="border-t my-4" />
                </>
              )}

              {/* Background Generation Section */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  🌐 Generate Backgrounds
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {LANDING_BG_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30"
                      onClick={() => handleBackgroundClick(preset)}
                      disabled={isGenerating}
                    >
                      <span className="text-blue-600 mr-1">{preset.icon}</span>
                      <span>{preset.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Section Generators */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  🏗️ Build Sections
                </h4>
                <div className="space-y-1">
                  {SECTION_ACTIONS.map((action) => (
                    <Button
                      key={action.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 px-3 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 group"
                      onClick={() => handleQuickAction(action.prompt)}
                      disabled={isGenerating}
                    >
                      <span className="text-blue-600 mr-3 group-hover:text-blue-700">
                        {action.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-blue-700">
                        {action.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Design Assistance Section */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  ✨ Design Assistance
                </h4>
                <div className="space-y-1">
                  {DESIGN_ACTIONS.map((action) => (
                    <Button
                      key={action.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 px-3 text-left hover:bg-purple-50 dark:hover:bg-purple-950/30 group"
                      onClick={() => handleQuickAction(action.prompt)}
                      disabled={isGenerating}
                    >
                      <span className="text-purple-600 mr-3 group-hover:text-purple-700">
                        {action.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-purple-700">
                        {action.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Chat history
            <div className="space-y-4">
              {/* Header with clear button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
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
                        ? 'bg-blue-600 text-white'
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

              {/* Quick actions below chat */}
              <div className="pt-4 border-t space-y-4">
                {/* Background Generation Section */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    🌐 Generate Backgrounds
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {LANDING_BG_PRESETS.slice(0, 4).map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30"
                        onClick={() => handleBackgroundClick(preset)}
                        disabled={isGenerating}
                      >
                        <span className="text-blue-600 mr-1">{preset.icon}</span>
                        <span>{preset.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Section Generators - Compact */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    🏗️ Build Sections
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {SECTION_ACTIONS.slice(0, 4).map((action) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30"
                        onClick={() => handleQuickAction(action.prompt)}
                        disabled={isGenerating}
                      >
                        <span className="text-blue-600 mr-1">{action.icon}</span>
                        <span>{action.label.replace('Generate ', '').replace('Add ', '')}</span>
                      </Button>
                    ))}
                  </div>
                </div>
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
            className="w-full bg-blue-600 hover:bg-blue-700"
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
