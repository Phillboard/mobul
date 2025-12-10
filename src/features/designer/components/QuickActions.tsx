/**
 * QuickActions Component
 * 
 * Quick action buttons that trigger AI prompts.
 * Used in the AI Assistant panel for one-click design actions.
 */

import { Button } from '@/components/ui/button';
import { Sparkles, Lightbulb, Palette, LayoutGrid, Image } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  description?: string;
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'generate-full',
    label: 'Generate full design',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: 'Generate a complete professional design for this mail piece with headline, body text, call to action, and appropriate layout',
    description: 'AI creates complete design',
  },
  {
    id: 'generate-image',
    label: 'Generate image',
    icon: <Image className="h-4 w-4" />,
    prompt: 'Generate a high-quality background image that would work well for this mail piece',
    description: 'AI creates custom image',
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
  /** Callback when action is clicked */
  onAction: (prompt: string) => void;
  /** Whether AI is currently processing */
  isLoading?: boolean;
  /** Optional className */
  className?: string;
}

export function QuickActions({
  actions = DEFAULT_QUICK_ACTIONS,
  onAction,
  isLoading = false,
  className = '',
}: QuickActionsProps) {
  return (
    <div className={className}>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Quick Actions
      </h4>
      <div className="space-y-2">
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

