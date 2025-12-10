/**
 * LayerPanel Component
 * 
 * Manages design layers - shows all elements, allows reordering,
 * visibility toggle, locking, and selection.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  GripVertical,
  Type,
  Image as ImageIcon,
  Square,
  QrCode,
  Sparkles,
} from 'lucide-react';
import type { DesignElement } from '../types/designer';

export interface LayerPanelProps {
  /** All design elements (layers) */
  elements: DesignElement[];
  /** Currently selected element IDs */
  selectedElementIds: string[];
  /** Callback when element is selected */
  onSelectElement: (id: string, multiSelect: boolean) => void;
  /** Callback when element is updated */
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  /** Callback when element is deleted */
  onDeleteElement: (id: string) => void;
  /** Callback when layer order changes */
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  /** Custom className */
  className?: string;
}

/**
 * Get icon for element type
 */
function getElementIcon(type: string) {
  switch (type) {
    case 'text':
      return Type;
    case 'image':
      return ImageIcon;
    case 'shape':
      return Square;
    case 'qr-code':
      return QrCode;
    case 'template-token':
      return Sparkles;
    default:
      return Square;
  }
}

/**
 * Get display name for element
 */
function getElementDisplayName(element: DesignElement): string {
  if (element.name) return element.name;

  switch (element.type) {
    case 'text':
      return 'content' in element
        ? element.content.substring(0, 20) + (element.content.length > 20 ? '...' : '')
        : 'Text';
    case 'image':
      return 'Image';
    case 'shape':
      return 'shapeType' in element
        ? `${element.shapeType.charAt(0).toUpperCase()}${element.shapeType.slice(1)}`
        : 'Shape';
    case 'qr-code':
      return 'QR Code';
    case 'template-token':
      return 'tokenContent' in element ? element.tokenContent.token : 'Token';
    default:
      return element.type;
  }
}

/**
 * LayerPanel component
 */
export function LayerPanel({
  elements,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onReorderLayers,
  className = '',
}: LayerPanelProps) {
  // Sort by zIndex (highest first for display)
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Layers</CardTitle>
        <CardDescription className="text-xs">
          {elements.length} layer{elements.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {elements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No layers yet. Add elements to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {sortedElements.map((element, displayIndex) => {
              const Icon = getElementIcon(element.type);
              const isSelected = selectedElementIds.includes(element.id);
              const actualIndex = elements.findIndex(el => el.id === element.id);

              return (
                <div
                  key={element.id}
                  className={`group flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-transparent hover:bg-accent hover:border-border'
                  }`}
                  onClick={(e) => onSelectElement(element.id, e.shiftKey)}
                >
                  {/* Drag handle */}
                  <button
                    className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      // TODO: Implement drag-to-reorder
                      e.stopPropagation();
                    }}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </button>

                  {/* Element icon and name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate">
                      {getElementDisplayName(element)}
                    </span>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-1">
                    {element.locked && (
                      <Badge variant="secondary" className="h-5 px-1">
                        <Lock className="h-3 w-3" />
                      </Badge>
                    )}
                    {!element.visible && (
                      <Badge variant="secondary" className="h-5 px-1">
                        <EyeOff className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateElement(element.id, { visible: !element.visible });
                      }}
                      className="h-7 w-7 p-0"
                    >
                      {element.visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateElement(element.id, { locked: !element.locked });
                      }}
                      className="h-7 w-7 p-0"
                    >
                      {element.locked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(element.id);
                      }}
                      className="h-7 w-7 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

