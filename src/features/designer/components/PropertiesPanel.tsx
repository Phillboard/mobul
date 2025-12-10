/**
 * PropertiesPanel Component
 * 
 * Professional properties editor with three tabs:
 * - Styles: Font, colors, alignment
 * - Arrangement: Position, size, layer order
 * - Effects: Rotation, border, shadow
 */

import { Settings, Sliders, Sparkles, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StylesTab } from './StylesTab';
import { ArrangementTab } from './ArrangementTab';
import { EffectsTab } from './EffectsTab';
import type { DesignElement, ElementUpdate } from '../types/designer';

export interface PropertiesPanelProps {
  /** Currently selected elements */
  selectedElements: DesignElement[];
  /** Callback when element properties change */
  onUpdateElement: (id: string, updates: ElementUpdate) => void;
  /** Callback to delete element */
  onDeleteElement: (id: string) => void;
  /** Callback to duplicate element */
  onDuplicateElement: (id: string) => void;
  /** Layer ordering callbacks */
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
  onBringForward?: (id: string) => void;
  onSendBackward?: (id: string) => void;
  /** Custom className */
  className?: string;
}

/**
 * PropertiesPanel component
 */
export function PropertiesPanel({
  selectedElements,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  className = '',
}: PropertiesPanelProps) {
  // No selection - show empty state
  if (selectedElements.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Settings className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  // Multiple selection
  if (selectedElements.length > 1) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-4">
          <p className="text-sm font-medium">{selectedElements.length} elements selected</p>
          <p className="text-xs text-muted-foreground">
            Multi-element editing coming soon
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              selectedElements.forEach(el => onDuplicateElement(el.id));
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate All
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => {
              selectedElements.forEach(el => onDeleteElement(el.id));
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>
    );
  }

  // Single element selected
  const element = selectedElements[0];

  const handleUpdate = (updates: Partial<DesignElement>) => {
    onUpdateElement(element.id, updates);
  };

  return (
    <div className={className}>
      {/* Element Type Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium capitalize">
            {element.type.replace('-', ' ')}
          </h3>
          <p className="text-xs text-muted-foreground">
            ID: {element.id.slice(0, 8)}...
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDuplicateElement(element.id)}
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDeleteElement(element.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="styles" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8 mb-4">
          <TabsTrigger value="styles" className="text-xs h-7">
            <Sparkles className="h-3 w-3 mr-1" />
            Styles
          </TabsTrigger>
          <TabsTrigger value="arrangement" className="text-xs h-7">
            <Sliders className="h-3 w-3 mr-1" />
            Arrange
          </TabsTrigger>
          <TabsTrigger value="effects" className="text-xs h-7">
            <Settings className="h-3 w-3 mr-1" />
            Effects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="styles" className="mt-0">
          <StylesTab element={element} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="arrangement" className="mt-0">
          <ArrangementTab
            element={element}
            onUpdate={handleUpdate}
            onBringToFront={onBringToFront ? () => onBringToFront(element.id) : undefined}
            onSendToBack={onSendToBack ? () => onSendToBack(element.id) : undefined}
            onBringForward={onBringForward ? () => onBringForward(element.id) : undefined}
            onSendBackward={onSendBackward ? () => onSendBackward(element.id) : undefined}
          />
        </TabsContent>

        <TabsContent value="effects" className="mt-0">
          <EffectsTab element={element} onUpdate={handleUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
