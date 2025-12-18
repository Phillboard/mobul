/**
 * LayersPanel Component
 * 
 * Panel for viewing and managing layers. Displays layers in z-order
 * with controls for visibility, locking, reordering, and deletion.
 */

import React from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Type,
  QrCode,
  Ticket,
  Phone,
  Square,
  Layers as LayersIcon,
} from 'lucide-react';
import { cn } from '@shared/utils/cn';
import type { CanvasLayer } from '../../types/layers';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface LayersPanelProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

function LayerItem({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  layer: CanvasLayer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  // Get icon for layer type
  const layerIcons = {
    background: <ImageIcon className="w-4 h-4" />,
    text: <Type className="w-4 h-4" />,
    image: <ImageIcon className="w-4 h-4" />,
    'qr-placeholder': <QrCode className="w-4 h-4" />,
    'code-box': <Ticket className="w-4 h-4" />,
    'phone-box': <Phone className="w-4 h-4" />,
    shape: <Square className="w-4 h-4" />,
  };
  
  const icon = layerIcons[layer.type];
  
  // Show token indicator for text layers with tokens
  const hasTokens = layer.type === 'text' && layer.containsTokens;
  
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
        isSelected 
          ? "bg-blue-100 text-blue-900 ring-1 ring-blue-300" 
          : "hover:bg-gray-100"
      )}
      onClick={onSelect}
    >
      {/* Layer type icon */}
      <div className="flex-shrink-0">
        {icon}
      </div>
      
      {/* Layer name */}
      <span className="flex-1 text-sm truncate">
        {layer.name}
        {hasTokens && (
          <span className="ml-1 text-xs text-purple-600 font-mono">
            {'{'}...{'}'}
          </span>
        )}
      </span>
      
      {/* Layer controls */}
      <div className="flex items-center gap-1">
        {/* Move up/down */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        {/* Visibility toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
        >
          {layer.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400" />
          )}
        </Button>
        
        {/* Lock toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {layer.locked ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Unlock className="h-4 w-4 text-gray-400" />
          )}
        </Button>
        
        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete layer "${layer.name}"?`)) {
              onDelete();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onReorder,
}: LayersPanelProps) {
  // Sort by zIndex descending (top layer first in list)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  
  return (
    <div className="layers-panel border rounded-lg bg-white shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b font-medium text-sm flex items-center gap-2">
        <LayersIcon className="w-4 h-4" />
        Layers
        <span className="ml-auto text-xs text-gray-500">
          {layers.length} layer{layers.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Layers list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedLayers.length > 0 ? (
            sortedLayers.map(layer => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isSelected={layer.id === selectedLayerId}
                onSelect={() => onSelectLayer(layer.id)}
                onToggleVisibility={() => onToggleVisibility(layer.id)}
                onToggleLock={() => onToggleLock(layer.id)}
                onDelete={() => onDelete(layer.id)}
                onMoveUp={() => onReorder(layer.id, 'up')}
                onMoveDown={() => onReorder(layer.id, 'down')}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              <LayersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No layers yet</p>
              <p className="text-xs mt-1">Add elements to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Helper text */}
      <div className="px-3 py-2 border-t text-xs text-gray-500">
        <p>💡 Tip: Layers at the top render above others</p>
      </div>
    </div>
  );
}

