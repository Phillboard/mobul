/**
 * QuickActions Component
 * 
 * Quick action buttons that trigger AI prompts.
 * Used in the AI Assistant panel for one-click design actions.
 * 
 * CRITICAL: Background generation prompts always include "No text, no personal information"
 * to ensure AI generates only backgrounds, never personalized content.
 */

import { Button } from '@/shared/components/ui/button';
import { 
  Sparkles, Lightbulb, Palette, LayoutGrid, Image,
  Users, Car, Coffee, UtensilsCrossed, Mountain, Shield, Building
} from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  description?: string;
}

/**
 * Background generation presets
 * All prompts include safety language to prevent text/personal info generation
 */
export const BACKGROUND_PRESETS: QuickAction[] = [
  {
    id: 'bg-lifestyle',
    label: 'Lifestyle',
    icon: <Users className="h-4 w-4" />,
    prompt: 'Generate a professional lifestyle background image showing happy people in a bright, welcoming setting. No text, no personal information, background only.',
  },
  {
    id: 'bg-automotive',
    label: 'Auto/Vehicle',
    icon: <Car className="h-4 w-4" />,
    prompt: 'Generate a premium automotive background showing a modern car on an open road or professional setting. No text, no license plates, no personal information.',
  },
  {
    id: 'bg-food-coffee',
    label: 'Coffee/Food',
    icon: <Coffee className="h-4 w-4" />,
    prompt: 'Generate an appetizing food and coffee photography background. Warm, inviting cafe or restaurant atmosphere. No logos, no text, no brand names.',
  },
  {
    id: 'bg-pizza',
    label: 'Pizza',
    icon: <UtensilsCrossed className="h-4 w-4" />,
    prompt: 'Generate a mouthwatering pizza photography background with delicious cheese and toppings on a rustic surface. No text, no logos, no brand names.',
  },
  {
    id: 'bg-abstract',
    label: 'Abstract',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate an abstract background with modern gradients, geometric shapes, and professional corporate feel. No text, clean design.',
  },
  {
    id: 'bg-insurance',
    label: 'Insurance/Trust',
    icon: <Shield className="h-4 w-4" />,
    prompt: 'Generate a professional background suggesting protection and trust. Family, home, or abstract safety imagery. Warm and trustworthy. No text.',
  },
  {
    id: 'bg-nature',
    label: 'Nature/Scenic',
    icon: <Mountain className="h-4 w-4" />,
    prompt: 'Generate a beautiful scenic nature background. Mountains, forests, or peaceful outdoor landscape. No text, no people.',
  },
  {
    id: 'bg-corporate',
    label: 'Corporate',
    icon: <Building className="h-4 w-4" />,
    prompt: 'Generate a professional corporate background. Modern office, business environment, or abstract professional design. No text, no logos.',
  },
];

/**
 * Design assistance quick actions
 */
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'generate-full',
    label: 'Generate full design',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate a complete professional design for this mail piece with headline, body text, call to action, and appropriate layout',
    description: 'AI creates complete design',
  },
  {
    id: 'suggest-headlines',
    label: 'Suggest headlines',
    icon: <Lightbulb className="h-4 w-4" />,
    prompt: 'Suggest 3 compelling headlines for this mail piece that will grab attention and drive response',
    description: 'Get headline ideas',
  },
  {
    id: 'color-palette',
    label: 'Color palette',
    icon: <Palette className="h-4 w-4" />,
    prompt: 'Suggest a professional color palette for this mail piece with primary, secondary, and accent colors that work well together',
    description: 'Get color suggestions',
  },
  {
    id: 'layout-ideas',
    label: 'Layout ideas',
    icon: <LayoutGrid className="h-4 w-4" />,
    prompt: 'Suggest 3 different layout arrangements for this mail piece considering visual hierarchy and readability',
    description: 'Get layout suggestions',
  },
];

export interface QuickActionsProps {
  /** Quick action definitions */
  actions?: QuickAction[];
  /** Callback when action is clicked (sends to chat) */
  onAction: (prompt: string) => void;
  /** Direct background image generation callback (bypasses chat) */
  onGenerateBackground?: (prompt: string) => Promise<void>;
  /** Whether AI is currently processing */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

export function QuickActions({
  actions = DEFAULT_QUICK_ACTIONS,
  onAction,
  onGenerateBackground,
  isLoading = false,
  className = '',
}: QuickActionsProps) {
  /**
   * Handle background button click
   * Uses direct generation if available, otherwise falls back to chat
   */
  const handleBackgroundClick = async (action: QuickAction) => {
    if (onGenerateBackground) {
      // Direct image generation - faster, more reliable
      await onGenerateBackground(action.prompt);
    } else {
      // Fallback to sending through chat
      onAction(action.prompt);
    }
  };
  return (
    <div className={className}>
      {/* Background Generation Section */}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        🎨 Generate Background
      </h4>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {BACKGROUND_PRESETS.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/30"
            onClick={() => handleBackgroundClick(action)}
            disabled={isLoading}
          >
            <span className="text-purple-600 mr-1">{action.icon}</span>
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Design Assistance Section */}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        ✨ Design Assistance
      </h4>
      <div className="space-y-1">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start h-auto py-2 px-3 text-left hover:bg-purple-50 dark:hover:bg-purple-950/30 group"
            onClick={() => onAction(action.prompt)}
            disabled={isLoading}
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
  );
}

