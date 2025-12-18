/**
 * QRPlaceholderRenderer Component
 * 
 * Renders a placeholder for QR codes that will be generated during mail merge.
 */

import React from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import type { QRPlaceholderLayer } from '../../types/layers';

export interface QRPlaceholderRendererProps {
  layer: QRPlaceholderLayer;
  isSelected: boolean;
  onClick: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

export function QRPlaceholderRenderer({
  layer,
  isSelected,
  onClick,
  onDragEnd,
}: QRPlaceholderRendererProps) {
  return (
    <div
      className={cn(
        "absolute flex items-center justify-center cursor-move",
        "border-2 border-dashed border-gray-400 bg-gray-100 rounded",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 border-blue-400"
      )}
      style={{
        left: `${layer.position.x}%`,
        top: `${layer.position.y}%`,
        width: layer.size.width,
        height: layer.size.height,
        transform: `rotate(${layer.rotation}deg)`,
        opacity: layer.opacity / 100,
        zIndex: layer.zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="text-center text-gray-500">
        <QrCode className="w-8 h-8 mx-auto mb-1" />
        <span className="text-xs font-medium">{layer.label}</span>
      </div>
    </div>
  );
}

