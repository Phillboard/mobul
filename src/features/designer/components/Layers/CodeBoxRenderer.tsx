/**
 * CodeBoxRenderer Component
 * 
 * Renders a code box that displays unique tracking codes.
 */

import React from 'react';
import { cn } from '@shared/utils/cn';
import type { CodeBoxLayer } from '../../types/layers';
import { replaceTokensWithPreview } from '../../utils/tokens';

export interface CodeBoxRendererProps {
  layer: CodeBoxLayer;
  isSelected: boolean;
  isPreviewMode: boolean;
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

const VARIANT_STYLES = {
  'ticket-stub': 'border-2 border-dashed rounded-sm',
  'rounded': 'rounded-lg shadow-sm border',
  'pill': 'rounded-full px-4 border',
  'plain': '',
};

export function CodeBoxRenderer({
  layer,
  isSelected,
  isPreviewMode,
  onClick,
  onDragEnd,
}: CodeBoxRendererProps) {
  const displayValue = isPreviewMode 
    ? replaceTokensWithPreview(layer.valueToken)
    : layer.valueToken;
  
  const isToken = layer.valueToken.includes('{{');
  const variantClasses = VARIANT_STYLES[layer.style.variant];
  
  return (
    <div
      className={cn(
        "absolute flex items-center gap-2 px-3 py-2 cursor-move",
        variantClasses,
        isSelected && "ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: `${layer.position.x}%`,
        top: `${layer.position.y}%`,
        backgroundColor: layer.style.backgroundColor,
        color: layer.style.textColor,
        borderColor: layer.style.borderColor,
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
      <span className="font-medium">{layer.labelText}</span>
      <span className="font-bold">
        {!isPreviewMode && isToken ? (
          <span className="bg-purple-100 text-purple-700 px-1 rounded font-mono">
            {layer.valueToken}
          </span>
        ) : (
          displayValue
        )}
      </span>
    </div>
  );
}

