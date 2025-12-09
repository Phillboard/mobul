/**
 * PropertiesPanel Component
 * 
 * Properties editor for selected design elements.
 * Context-aware - shows different controls based on element type.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Lock, Unlock, Trash2, Copy } from 'lucide-react';
import type { DesignElement, ElementUpdate, FontWeight, TextAlign } from '../types/designer';

export interface PropertiesPanelProps {
  /** Currently selected elements */
  selectedElements: DesignElement[];
  /** Callback when element properties change */
  onUpdateElement: (id: string, updates: ElementUpdate) => void;
  /** Callback to delete element */
  onDeleteElement: (id: string) => void;
  /** Callback to duplicate element */
  onDuplicateElement: (id: string) => void;
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
  className = '',
}: PropertiesPanelProps) {
  // No selection
  if (selectedElements.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Properties</CardTitle>
          <CardDescription className="text-xs">
            Select an element to edit its properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No element selected
          </p>
        </CardContent>
      </Card>
    );
  }

  // Multiple selection
  if (selectedElements.length > 1) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Properties</CardTitle>
          <CardDescription className="text-xs">
            {selectedElements.length} elements selected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Multi-element editing coming soon
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              selectedElements.forEach(el => onDeleteElement(el.id));
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Single element selected
  const element = selectedElements[0];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base capitalize">
              {element.type.replace('-', ' ')} Properties
            </CardTitle>
            <CardDescription className="text-xs">
              Edit element properties
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicateElement(element.id)}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onUpdateElement(element.id, { locked: !element.locked })
              }
              className="h-8 w-8 p-0"
            >
              {element.locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteElement(element.id)}
              className="h-8 w-8 p-0 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common Properties */}
        <CommonProperties element={element} onUpdate={onUpdateElement} />

        <Separator />

        {/* Type-specific Properties */}
        {element.type === 'text' && 'content' in element && (
          <TextProperties element={element} onUpdate={onUpdateElement} />
        )}

        {element.type === 'image' && 'src' in element && (
          <ImageProperties element={element} onUpdate={onUpdateElement} />
        )}

        {element.type === 'shape' && 'shapeType' in element && (
          <ShapeProperties element={element} onUpdate={onUpdateElement} />
        )}

        {element.type === 'template-token' && 'tokenContent' in element && (
          <TokenProperties element={element} onUpdate={onUpdateElement} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Common properties (position, size, rotation)
 */
function CommonProperties({
  element,
  onUpdate,
}: {
  element: DesignElement;
  onUpdate: (id: string, updates: ElementUpdate) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">Position & Size</h4>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X</Label>
          <Input
            type="number"
            value={Math.round(element.x)}
            onChange={(e) =>
              onUpdate(element.id, { x: parseFloat(e.target.value) || 0 })
            }
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Y</Label>
          <Input
            type="number"
            value={Math.round(element.y)}
            onChange={(e) =>
              onUpdate(element.id, { y: parseFloat(e.target.value) || 0 })
            }
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Width</Label>
          <Input
            type="number"
            value={Math.round(element.width)}
            onChange={(e) =>
              onUpdate(element.id, { width: parseFloat(e.target.value) || 1 })
            }
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Height</Label>
          <Input
            type="number"
            value={Math.round(element.height)}
            onChange={(e) =>
              onUpdate(element.id, { height: parseFloat(e.target.value) || 1 })
            }
            className="h-8"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Rotation ({element.rotation}°)</Label>
        <Slider
          value={[element.rotation]}
          onValueChange={([value]) => onUpdate(element.id, { rotation: value })}
          min={0}
          max={360}
          step={1}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-xs">Opacity ({Math.round((element.styles.opacity || 1) * 100)}%)</Label>
        <Slider
          value={[(element.styles.opacity || 1) * 100]}
          onValueChange={([value]) =>
            onUpdate(element.id, {
              styles: { ...element.styles, opacity: value / 100 },
            })
          }
          min={0}
          max={100}
          step={1}
          className="mt-2"
        />
      </div>
    </div>
  );
}

/**
 * Text-specific properties
 */
function TextProperties({
  element,
  onUpdate,
}: {
  element: any;
  onUpdate: (id: string, updates: ElementUpdate) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">Text</h4>

      <div>
        <Label className="text-xs">Content</Label>
        <Textarea
          value={element.content}
          onChange={(e) => onUpdate(element.id, { content: e.target.value })}
          className="min-h-20 text-sm"
          placeholder="Enter text..."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={element.styles.fontSize || 16}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, fontSize: parseFloat(e.target.value) || 16 },
              })
            }
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Font Weight</Label>
          <Select
            value={element.styles.fontWeight || 'normal'}
            onValueChange={(value) =>
              onUpdate(element.id, {
                styles: { ...element.styles, fontWeight: value as FontWeight },
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="600">Semi-Bold</SelectItem>
              <SelectItem value="300">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Font Family</Label>
        <Select
          value={element.styles.fontFamily || 'Arial'}
          onValueChange={(value) =>
            onUpdate(element.id, {
              styles: { ...element.styles, fontFamily: value },
            })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={element.styles.color || '#000000'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, color: e.target.value },
              })
            }
            className="h-8 w-16"
          />
          <Input
            type="text"
            value={element.styles.color || '#000000'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, color: e.target.value },
              })
            }
            className="h-8 flex-1"
            placeholder="#000000"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Alignment</Label>
        <Select
          value={element.styles.textAlign || 'left'}
          onValueChange={(value) =>
            onUpdate(element.id, {
              styles: { ...element.styles, textAlign: value as TextAlign },
            })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="justify">Justify</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Image-specific properties
 */
function ImageProperties({
  element,
  onUpdate,
}: {
  element: any;
  onUpdate: (id: string, updates: ElementUpdate) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">Image</h4>

      <div>
        <Label className="text-xs">Image URL</Label>
        <Input
          type="url"
          value={element.src || ''}
          onChange={(e) => onUpdate(element.id, { src: e.target.value })}
          className="h-8 text-sm"
          placeholder="https://..."
        />
      </div>

      <div>
        <Label className="text-xs">Alt Text</Label>
        <Input
          type="text"
          value={element.alt || ''}
          onChange={(e) => onUpdate(element.id, { alt: e.target.value })}
          className="h-8 text-sm"
          placeholder="Image description"
        />
      </div>

      <div>
        <Label className="text-xs">Fit Mode</Label>
        <Select
          value={element.fit || 'cover'}
          onValueChange={(value) =>
            onUpdate(element.id, { fit: value as 'cover' | 'contain' | 'fill' })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Shape-specific properties
 */
function ShapeProperties({
  element,
  onUpdate,
}: {
  element: any;
  onUpdate: (id: string, updates: ElementUpdate) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">Shape</h4>

      <div>
        <Label className="text-xs">Fill Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={element.styles.backgroundColor || '#E5E7EB'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, backgroundColor: e.target.value },
              })
            }
            className="h-8 w-16"
          />
          <Input
            type="text"
            value={element.styles.backgroundColor || '#E5E7EB'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, backgroundColor: e.target.value },
              })
            }
            className="h-8 flex-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Border Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={element.styles.borderColor || '#000000'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, borderColor: e.target.value },
              })
            }
            className="h-8 w-16"
          />
          <Input
            type="text"
            value={element.styles.borderColor || '#000000'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, borderColor: e.target.value },
              })
            }
            className="h-8 flex-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Border Width</Label>
        <Input
          type="number"
          value={element.styles.borderWidth || 1}
          onChange={(e) =>
            onUpdate(element.id, {
              styles: { ...element.styles, borderWidth: parseFloat(e.target.value) || 0 },
            })
          }
          min={0}
          className="h-8"
        />
      </div>

      {element.shapeType === 'rectangle' && (
        <div>
          <Label className="text-xs">Corner Radius</Label>
          <Input
            type="number"
            value={element.styles.borderRadius || 0}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, borderRadius: parseFloat(e.target.value) || 0 },
              })
            }
            min={0}
            className="h-8"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Template token properties
 */
function TokenProperties({
  element,
  onUpdate,
}: {
  element: any;
  onUpdate: (id: string, updates: ElementUpdate) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">Token</h4>

      <div>
        <Label className="text-xs">Token</Label>
        <Input
          type="text"
          value={element.tokenContent.token}
          onChange={(e) =>
            onUpdate(element.id, {
              tokenContent: {
                ...element.tokenContent,
                token: e.target.value,
              },
            })
          }
          className="h-8 font-mono text-sm"
          placeholder="{{first_name}}"
        />
      </div>

      <div>
        <Label className="text-xs">Fallback Value</Label>
        <Input
          type="text"
          value={element.tokenContent.fallback}
          onChange={(e) =>
            onUpdate(element.id, {
              tokenContent: {
                ...element.tokenContent,
                fallback: e.target.value,
              },
            })
          }
          className="h-8 text-sm"
          placeholder="Default value"
        />
      </div>

      <div>
        <Label className="text-xs">Transform</Label>
        <Select
          value={element.tokenContent.transform || 'none'}
          onValueChange={(value) =>
            onUpdate(element.id, {
              tokenContent: {
                ...element.tokenContent,
                transform: value as 'uppercase' | 'lowercase' | 'titlecase' | 'none',
              },
            })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="uppercase">UPPERCASE</SelectItem>
            <SelectItem value="lowercase">lowercase</SelectItem>
            <SelectItem value="titlecase">Title Case</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Also show text formatting for token elements */}
      <Separator />
      <h4 className="text-xs font-semibold text-muted-foreground">Text Style</h4>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Font Size</Label>
          <Input
            type="number"
            value={element.styles.fontSize || 16}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, fontSize: parseFloat(e.target.value) || 16 },
              })
            }
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={element.styles.color || '#4F46E5'}
            onChange={(e) =>
              onUpdate(element.id, {
                styles: { ...element.styles, color: e.target.value },
              })
            }
            className="h-8"
          />
        </div>
      </div>
    </div>
  );
}

