/**
 * PhoneBoxRenderer Component
 * 
 * Renders a phone number display box.
 */

import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import type { PhoneBoxLayer } from '../../types/layers';

export interface PhoneBoxRendererProps {
  layer: PhoneBoxLayer;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

const VARIANT_STYLES = {
  'banner': 'rounded-full px-6 py-2 shadow-md',
  'button': 'rounded-lg px-4 py-3 shadow-lg font-bold',
  'plain': 'font-bold',
  'with-cta': 'rounded-lg overflow-hidden flex',
};

export function PhoneBoxRenderer({
  layer,
  isSelected,
  onClick,
  onDragEnd,
}: PhoneBoxRendererProps) {
  const variantClasses = VARIANT_STYLES[layer.style.variant];
  const showIcon = layer.style.icon;
  
  return (
    <div
      className={cn(
        "absolute flex items-center gap-2 cursor-move",
        variantClasses,
        isSelected && "ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: `${layer.position.x}%`,
        top: `${layer.position.y}%`,
        backgroundColor: layer.style.backgroundColor,
        color: layer.style.textColor,
        fontSize: layer.style.fontSize,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity / 100,
        zIndex: layer.zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {showIcon && <Phone className="w-5 h-5" />}
      
      {layer.style.variant === 'with-cta' && layer.style.ctaText ? (
        <>
          <span className="bg-black/20 px-3 py-2 text-sm font-medium">
            {layer.style.ctaText}
          </span>
          <span className="px-4 py-2 font-bold">
            {layer.phoneNumber}
          </span>
        </>
      ) : (
        <span className="font-bold">{layer.phoneNumber}</span>
      )}
    </div>
  );
}

