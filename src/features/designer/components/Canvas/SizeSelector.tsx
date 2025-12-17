/**
 * Size Selector Component
 * Dropdown for selecting postcard size
 */

import React from 'react';
import type { PostcardSize } from '../../types/canvas';
import { SIZE_CONFIGS } from '../../types/canvas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

export interface SizeSelectorProps {
  value: PostcardSize;
  onChange: (size: PostcardSize) => void;
  disabled?: boolean;
}

export function SizeSelector({ value, onChange, disabled }: SizeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select size" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SIZE_CONFIGS).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              {/* Visual preview of aspect ratio */}
              <div className="flex items-center justify-center w-8 h-8">
                <div
                  className="bg-gray-300 border border-gray-400"
                  style={{
                    width: config.defaultOrientation === 'landscape' ? '28px' : '18px',
                    height: config.defaultOrientation === 'landscape' ? '18px' : '28px',
                  }}
                />
              </div>
              
              <div>
                <div className="font-medium">{config.displayName}</div>
                <div className="text-xs text-gray-500">
                  {config.defaultOrientation === 'landscape' ? 'Landscape' : 'Portrait'}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
