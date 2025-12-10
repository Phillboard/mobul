/**
 * StylesTab Component
 * 
 * Properties panel tab for styling elements:
 * - Font family, size, weight
 * - Text color, highlight color
 * - Alignment, line height
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import type { DesignElement, ElementStyles } from '../types/designer';

const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' },
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

export interface StylesTabProps {
  element: DesignElement;
  onUpdate: (updates: Partial<DesignElement>) => void;
}

export function StylesTab({ element, onUpdate }: StylesTabProps) {
  const styles = element.styles || {};
  const isTextElement = element.type === 'text' || element.type === 'template-token';

  const updateStyles = (styleUpdates: Partial<ElementStyles>) => {
    onUpdate({
      styles: { ...styles, ...styleUpdates },
    });
  };

  const toggleFontWeight = () => {
    const currentWeight = styles.fontWeight || 'normal';
    updateStyles({ fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' });
  };

  return (
    <div className="space-y-4">
      {/* Font Family */}
      {isTextElement && (
        <div className="space-y-2">
          <Label className="text-xs">Font Family</Label>
          <Select
            value={styles.fontFamily || 'Arial'}
            onValueChange={(value) => updateStyles({ fontFamily: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Font Size */}
      {isTextElement && (
        <div className="space-y-2">
          <Label className="text-xs">Font Size</Label>
          <Select
            value={String(styles.fontSize || 16)}
            onValueChange={(value) => updateStyles({ fontSize: Number(value) })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Text Style Buttons */}
      {isTextElement && (
        <div className="space-y-2">
          <Label className="text-xs">Text Style</Label>
          <div className="flex gap-1">
            <Button
              variant={styles.fontWeight === 'bold' ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={toggleFontWeight}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Text Color */}
      {isTextElement && (
        <div className="space-y-2">
          <Label className="text-xs">Text Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={styles.color || '#000000'}
              onChange={(e) => updateStyles({ color: e.target.value })}
              className="h-8 w-12 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={styles.color || '#000000'}
              onChange={(e) => updateStyles({ color: e.target.value })}
              className="h-8 flex-1 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* Highlight/Background Color */}
      <div className="space-y-2">
        <Label className="text-xs">Background Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={styles.backgroundColor || '#ffffff'}
            onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
            className="h-8 w-12 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={styles.backgroundColor || '#ffffff'}
            onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
            className="h-8 flex-1 font-mono text-xs"
          />
        </div>
      </div>

      {/* Text Alignment */}
      {isTextElement && (
        <div className="space-y-2">
          <Label className="text-xs">Alignment</Label>
          <div className="flex gap-1">
            {[
              { value: 'left', icon: AlignLeft },
              { value: 'center', icon: AlignCenter },
              { value: 'right', icon: AlignRight },
              { value: 'justify', icon: AlignJustify },
            ].map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={styles.textAlign === value ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => updateStyles({ textAlign: value as any })}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Line Height */}
      {isTextElement && (
        <div className="space-y-2">
          <Label className="text-xs">Line Height</Label>
          <Input
            type="number"
            value={styles.lineHeight || 1.5}
            onChange={(e) => updateStyles({ lineHeight: Number(e.target.value) })}
            step={0.1}
            min={0.5}
            max={3}
            className="h-8"
          />
        </div>
      )}

      {/* Opacity */}
      <div className="space-y-2">
        <Label className="text-xs">Opacity</Label>
        <Input
          type="range"
          value={(styles.opacity ?? 1) * 100}
          onChange={(e) => updateStyles({ opacity: Number(e.target.value) / 100 })}
          min={0}
          max={100}
          className="h-8"
        />
      </div>
    </div>
  );
}

