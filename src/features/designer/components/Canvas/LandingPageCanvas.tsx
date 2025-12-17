/**
 * Landing Page Canvas Component
 * Canvas for landing page preview with device frames
 */

import React, { ReactNode } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from '@/shared/components/ui/button';
import type { LandingPageConfig } from '../../types/landingPage';
import type { DesignerContext } from '../../types/context';
import { LANDING_PAGE_DIMENSIONS } from '../../types/landingPage';

export interface LandingPageCanvasProps {
  config: LandingPageConfig;
  context: DesignerContext;
  children?: ReactNode;
  className?: string;
}

export function LandingPageCanvas({ config, context, children, className }: LandingPageCanvasProps) {
  const dimensions = LANDING_PAGE_DIMENSIONS[config.previewDevice];
  
  return (
    <div className={cn("landing-canvas-container flex justify-center p-6 bg-gray-100", className)}>
      <div className={cn(
        "device-frame bg-white rounded-lg shadow-2xl overflow-hidden",
        config.previewDevice === 'mobile' && "rounded-3xl border-8 border-gray-900",
        config.previewDevice === 'tablet' && "rounded-2xl",
        config.previewDevice === 'desktop' && "rounded-lg"
      )}>
        {/* Browser chrome for desktop */}
        {config.previewDevice === 'desktop' && (
          <div className="browser-chrome bg-gray-100 px-3 py-2 flex items-center gap-3 border-b border-gray-200">
            <div className="browser-dots flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="browser-url flex-1 bg-white rounded px-3 py-1 text-xs text-gray-600">
              yoursite.com/claim-gift-card
            </div>
          </div>
        )}
        
        {/* Phone notch for mobile */}
        {config.previewDevice === 'mobile' && (
          <div className="phone-notch absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl" />
        )}
        
        {/* Content area */}
        <div 
          className="canvas-content overflow-auto bg-white"
          style={{
            width: dimensions.width,
            maxWidth: '100%',
            aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Device Switcher Component
 */
export interface DeviceSwitcherProps {
  value: 'desktop' | 'tablet' | 'mobile';
  onChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
}

export function DeviceSwitcher({ value, onChange }: DeviceSwitcherProps) {
  return (
    <div className="device-switcher inline-flex rounded-md shadow-sm" role="group">
      <Button
        type="button"
        variant={value === 'desktop' ? 'default' : 'outline'}
        size="sm"
        className="rounded-r-none"
        onClick={() => onChange('desktop')}
      >
        <Monitor className="h-4 w-4 mr-2" />
        Desktop
      </Button>
      <Button
        type="button"
        variant={value === 'tablet' ? 'default' : 'outline'}
        size="sm"
        className="rounded-none border-l-0"
        onClick={() => onChange('tablet')}
      >
        <Tablet className="h-4 w-4 mr-2" />
        Tablet
      </Button>
      <Button
        type="button"
        variant={value === 'mobile' ? 'default' : 'outline'}
        size="sm"
        className="rounded-l-none border-l-0"
        onClick={() => onChange('mobile')}
      >
        <Smartphone className="h-4 w-4 mr-2" />
        Mobile
      </Button>
    </div>
  );
}
