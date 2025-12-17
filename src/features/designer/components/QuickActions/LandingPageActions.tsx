/**
 * Landing Page Quick Actions
 * Quick actions specific to landing page designer
 */

import React from 'react';
import { Sparkles, Layout, FileInput } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { DesignerContext } from '../../types/context';
import type { LandingPageConfig } from '../../types/landingPage';
import { getLandingPagePrompt, getLandingHeroPrompt, getLandingFormPrompt } from '../../templates/landingPagePrompts';
import { DeviceSwitcher } from '../Canvas/LandingPageCanvas';

export interface LandingPageActionsProps {
  context: DesignerContext;
  config: LandingPageConfig;
  onGenerate: (prompt: string) => void;
  onConfigChange: (config: LandingPageConfig) => void;
  isGenerating: boolean;
}

export function LandingPageActions({
  context,
  config,
  onGenerate,
  onConfigChange,
  isGenerating,
}: LandingPageActionsProps) {
  const brand = context.giftCard?.brand || 'Gift Card';
  
  return (
    <div className="space-y-4">
      {/* Page Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Page
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => onGenerate(getLandingPagePrompt(context, config))}
            disabled={isGenerating}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate {brand} landing page
          </Button>
        </CardContent>
      </Card>

      {/* Section Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Sections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={() => onGenerate(getLandingHeroPrompt(context, config))}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Layout className="h-4 w-4 mr-2" />
            Generate hero section
          </Button>
          <Button
            onClick={() => onGenerate(getLandingFormPrompt(context, config))}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <FileInput className="h-4 w-4 mr-2" />
            Generate form section
          </Button>
        </CardContent>
      </Card>

      {/* Device Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Preview Device</CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceSwitcher
            value={config.previewDevice}
            onChange={(device) => onConfigChange({ ...config, previewDevice: device })}
          />
        </CardContent>
      </Card>

      {/* Page Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Page Style</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={config.style}
            onValueChange={(style: 'minimal' | 'standard' | 'detailed') => 
              onConfigChange({ ...config, style })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal (Less sections)</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="detailed">Detailed (More sections)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Context Indicator */}
      {context.hasContext && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
              <div className="text-xs text-purple-900">
                {context.giftCard && (
                  <div className="font-medium">
                    ${context.giftCard.amount} {context.giftCard.brand}
                  </div>
                )}
                <div className="text-purple-700">{context.company.name}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
