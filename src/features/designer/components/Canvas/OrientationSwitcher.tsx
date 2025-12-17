/**
 * Orientation Switcher Component
 * Toggle between landscape and portrait orientations
 */

import React from 'react';
import { cn } from '@/shared/utils';
import type { Orientation } from '../../types/canvas';
import { Button } from '@/shared/components/ui/button';
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';

export interface OrientationSwitcherProps {
  value: Orientation;
  onChange: (orientation: Orientation) => void;
  disabled?: boolean;
}

export function OrientationSwitcher({ value, onChange, disabled }: OrientationSwitcherProps) {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <Button
        type="button"
        variant={value === 'landscape' ? 'default' : 'outline'}
        size="sm"
        className={cn(
          "rounded-r-none",
          value === 'landscape' && "bg-primary text-primary-foreground"
        )}
        onClick={() => onChange('landscape')}
        disabled={disabled}
      >
        <RectangleHorizontal className="h-4 w-4 mr-2" />
        Landscape
      </Button>
      <Button
        type="button"
        variant={value === 'portrait' ? 'default' : 'outline'}
        size="sm"
        className={cn(
          "rounded-l-none border-l-0",
          value === 'portrait' && "bg-primary text-primary-foreground"
        )}
        onClick={() => onChange('portrait')}
        disabled={disabled}
      >
        <RectangleVertical className="h-4 w-4 mr-2" />
        Portrait
      </Button>
    </div>
  );
}
