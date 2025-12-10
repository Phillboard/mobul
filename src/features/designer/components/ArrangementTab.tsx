/**
 * ArrangementTab Component
 * 
 * Properties panel tab for position and layer ordering:
 * - Position (X, Y)
 * - Size (Width, Height)
 * - Layer ordering (front, back, forward, backward)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Move,
} from 'lucide-react';
import type { DesignElement } from '../types/designer';

export interface ArrangementTabProps {
  element: DesignElement;
  onUpdate: (updates: Partial<DesignElement>) => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
}

export function ArrangementTab({
  element,
  onUpdate,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
}: ArrangementTabProps) {
  return (
    <div className="space-y-4">
      {/* Position */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1">
          <Move className="h-3 w-3" />
          Position
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">X (px)</Label>
            <Input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onUpdate({ x: Number(e.target.value) })}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y (px)</Label>
            <Input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onUpdate({ y: Number(e.target.value) })}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <Label className="text-xs">Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Width (px)</Label>
            <Input
              type="number"
              value={Math.round(element.width)}
              onChange={(e) => onUpdate({ width: Number(e.target.value) })}
              min={10}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height (px)</Label>
            <Input
              type="number"
              value={Math.round(element.height)}
              onChange={(e) => onUpdate({ height: Number(e.target.value) })}
              min={10}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* Quick Position Nudge */}
      <div className="space-y-2">
        <Label className="text-xs">Nudge Position</Label>
        <div className="grid grid-cols-3 gap-1">
          <div />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onUpdate({ y: element.y - 10 })}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <div />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onUpdate({ x: element.x - 10 })}
          >
            <ArrowUp className="h-4 w-4 -rotate-90" />
          </Button>
          <div className="h-8 flex items-center justify-center text-xs text-muted-foreground">
            10px
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onUpdate({ x: element.x + 10 })}
          >
            <ArrowDown className="h-4 w-4 -rotate-90" />
          </Button>
          <div />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onUpdate({ y: element.y + 10 })}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <div />
        </div>
      </div>

      {/* Layer Ordering */}
      <div className="space-y-2">
        <Label className="text-xs">Layer Order</Label>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8"
            onClick={onSendToBack}
            title="Send to Back"
          >
            <ChevronsDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8"
            onClick={onSendBackward}
            title="Send Backward"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8"
            onClick={onBringForward}
            title="Bring Forward"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8"
            onClick={onBringToFront}
            title="Bring to Front"
          >
            <ChevronsUp className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex text-xs text-muted-foreground justify-between px-1">
          <span>Back</span>
          <span>Front</span>
        </div>
      </div>

      {/* Lock Toggle */}
      <div className="space-y-2">
        <Label className="text-xs">Lock Element</Label>
        <Button
          variant={element.locked ? 'default' : 'outline'}
          size="sm"
          className="w-full h-8"
          onClick={() => onUpdate({ locked: !element.locked })}
        >
          {element.locked ? '🔒 Locked' : '🔓 Unlocked'}
        </Button>
      </div>
    </div>
  );
}

