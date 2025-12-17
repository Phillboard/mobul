/**
 * Context-Aware Quick Actions
 * Quick action buttons that use campaign context and premium prompts
 */

import React from 'react';
import { Sparkles, FileText, Palette } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { DesignerContext } from '../../types/context';
import type { CanvasConfig } from '../../types/canvas';
import { getFrontDesignPrompt } from '../../templates/frontPrompts';
import { getBackDesignPrompt } from '../../templates/backPrompts';
import { getBackgroundPrompt, getBrandBackgroundSuggestions } from '../../templates/backgroundPrompts';
import type { BackgroundStyle } from '../../templates/backgroundPrompts';
import { SizeSelector } from '../Canvas/SizeSelector';
import { OrientationSwitcher } from '../Canvas/OrientationSwitcher';
import type { PostcardSize, Orientation } from '../../types/canvas';

export interface ContextAwareActionsProps {
  context: DesignerContext;
  config: CanvasConfig;
  onGenerate: (prompt: string) => void;
  onSizeChange?: (size: PostcardSize) => void;
  onOrientationChange?: (orientation: Orientation) => void;
  isGenerating: boolean;
}

export function ContextAwareActions({
  context,
  config,
  onGenerate,
  onSizeChange,
  onOrientationChange,
  isGenerating,
}: ContextAwareActionsProps) {
  const frontPrompt = getFrontDesignPrompt(context, config);
  const backPrompt = getBackDesignPrompt(context, config);
  const backgroundSuggestions = getBrandBackgroundSuggestions(context);
  
  const frontLabel = context.giftCard 
    ? `Design front: $${context.giftCard.amount} ${context.giftCard.brand}`
    : 'Design front';
  
  const backLabel = context.industry
    ? `Design back: ${context.industry.displayName}`
    : 'Design back';

  return (
    <div className="space-y-4">
      {/* Design Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Design Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={() => onGenerate(frontPrompt)}
            disabled={isGenerating || config.side === 'back'}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {frontLabel}
          </Button>
          <Button
            onClick={() => onGenerate(backPrompt)}
            disabled={isGenerating || config.side === 'front'}
            variant="outline"
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            {backLabel}
          </Button>
        </CardContent>
      </Card>

      {/* Backgrounds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Backgrounds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {backgroundSuggestions.map(style => (
              <BackgroundButton
                key={style}
                style={style}
                onClick={() => onGenerate(getBackgroundPrompt(context, config, style))}
                disabled={isGenerating}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Canvas Settings */}
      {onSizeChange && onOrientationChange && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Canvas Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Size</label>
              <SizeSelector 
                value={config.size as PostcardSize} 
                onChange={onSizeChange}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Orientation</label>
              <OrientationSwitcher
                value={config.orientation}
                onChange={onOrientationChange}
                disabled={isGenerating}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context Indicator */}
      {context.hasContext && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div className="text-xs text-blue-900">
                <div className="font-medium">Context: {context.company.name}</div>
                {context.giftCard && (
                  <div className="text-blue-700">
                    ${context.giftCard.amount} {context.giftCard.brand} • {context.industry.displayName}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Background style button
 */
function BackgroundButton({ 
  style, 
  onClick, 
  disabled 
}: { 
  style: BackgroundStyle; 
  onClick: () => void; 
  disabled: boolean;
}) {
  const labels: Record<BackgroundStyle, { icon: string; label: string }> = {
    'gift-card-reveal': { icon: '🌟', label: 'Gold Reveal' },
    'food-hero': { icon: '🍕', label: 'Food Hero' },
    'celebration': { icon: '🎉', label: 'Celebration' },
    'lifestyle': { icon: '☕', label: 'Lifestyle' },
    'industry': { icon: '🏢', label: 'Industry' },
    'clean-gradient': { icon: '🎨', label: 'Gradient' },
  };
  
  const { icon, label } = labels[style];
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center h-16"
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs">{label}</span>
    </Button>
  );
}

