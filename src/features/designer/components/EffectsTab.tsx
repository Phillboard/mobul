/**
 * EffectsTab Component
 * 
 * Properties panel tab for visual effects:
 * - Rotation
 * - Corner Radius
 * - Border (style, width, color)
 * - Shadow (text and box)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCw, Square, Droplets } from 'lucide-react';
import type { DesignElement, ElementStyles } from '../types/designer';

export interface EffectsTabProps {
  element: DesignElement;
  onUpdate: (updates: Partial<DesignElement>) => void;
}

export function EffectsTab({ element, onUpdate }: EffectsTabProps) {
  const styles = element.styles || {};

  const updateStyles = (styleUpdates: Partial<ElementStyles>) => {
    onUpdate({
      styles: { ...styles, ...styleUpdates },
    });
  };

  return (
    <div className="space-y-4">
      {/* Rotation */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <RotateCw className="h-3 w-3" />
          Rotation
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            type="range"
            value={element.rotation || 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
            min={-180}
            max={180}
            className="flex-1"
          />
          <Input
            type="number"
            value={element.rotation || 0}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
            className="h-8 w-16 text-xs"
          />
          <span className="text-xs text-muted-foreground">°</span>
        </div>
      </div>

      {/* Corner Radius */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Square className="h-3 w-3" />
          Corner Radius
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            type="range"
            value={styles.borderRadius || 0}
            onChange={(e) => updateStyles({ borderRadius: Number(e.target.value) })}
            min={0}
            max={100}
            className="flex-1"
          />
          <Input
            type="number"
            value={styles.borderRadius || 0}
            onChange={(e) => updateStyles({ borderRadius: Number(e.target.value) })}
            className="h-8 w-16 text-xs"
          />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
      </div>

      {/* Border */}
      <div className="space-y-2">
        <Label className="text-xs">Border</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Select
              value={styles.borderStyle || 'solid'}
              onValueChange={(value) => updateStyles({ borderStyle: value as any })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={styles.borderWidth || 0}
              onChange={(e) => updateStyles({ borderWidth: Number(e.target.value) })}
              min={0}
              max={20}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Color</Label>
            <Input
              type="color"
              value={styles.borderColor || '#000000'}
              onChange={(e) => updateStyles({ borderColor: e.target.value })}
              className="h-8 p-1 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Box Shadow */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          Box Shadow
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Offset X</Label>
            <Input
              type="number"
              value={styles.shadow?.offsetX || 0}
              onChange={(e) => updateStyles({
                shadow: { ...styles.shadow, offsetX: Number(e.target.value), offsetY: styles.shadow?.offsetY || 0, blur: styles.shadow?.blur || 0, color: styles.shadow?.color || '#00000040' }
              })}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Offset Y</Label>
            <Input
              type="number"
              value={styles.shadow?.offsetY || 0}
              onChange={(e) => updateStyles({
                shadow: { ...styles.shadow, offsetX: styles.shadow?.offsetX || 0, offsetY: Number(e.target.value), blur: styles.shadow?.blur || 0, color: styles.shadow?.color || '#00000040' }
              })}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Blur</Label>
            <Input
              type="number"
              value={styles.shadow?.blur || 0}
              onChange={(e) => updateStyles({
                shadow: { ...styles.shadow, offsetX: styles.shadow?.offsetX || 0, offsetY: styles.shadow?.offsetY || 0, blur: Number(e.target.value), color: styles.shadow?.color || '#00000040' }
              })}
              min={0}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Color</Label>
            <Input
              type="color"
              value={styles.shadow?.color || '#000000'}
              onChange={(e) => updateStyles({
                shadow: { ...styles.shadow, offsetX: styles.shadow?.offsetX || 0, offsetY: styles.shadow?.offsetY || 0, blur: styles.shadow?.blur || 0, color: e.target.value }
              })}
              className="h-8 p-1 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

