import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Save,
  Eye,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopActionBarProps {
  templateName: string;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSave: () => void;
  onPreview: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
  hasSelection: boolean;
  onAlign?: (direction: string) => void;
}

export function TopActionBar({
  templateName,
  onBack,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onSave,
  onPreview,
  isSaving,
  lastSaved,
  hasSelection,
  onAlign,
}: TopActionBarProps) {
  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">{templateName}</h1>
          {lastSaved && (
            <p className="text-xs text-muted-foreground">
              {isSaving ? "Saving..." : `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`}
            </p>
          )}
        </div>
      </div>

      {/* Center section */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center px-2">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment - only visible when there's a selection */}
        {hasSelection && onAlign && (
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onAlign("left")}>
                  <AlignLeft className="h-4 w-4 mr-2" />
                  Align Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAlign("center")}>
                  <AlignCenter className="h-4 w-4 mr-2" />
                  Align Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAlign("right")}>
                  <AlignRight className="h-4 w-4 mr-2" />
                  Align Right
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAlign("top")}>
                  <AlignVerticalJustifyStart className="h-4 w-4 mr-2" />
                  Align Top
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAlign("middle")}>
                  <AlignVerticalJustifyCenter className="h-4 w-4 mr-2" />
                  Align Middle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAlign("bottom")}>
                  <AlignVerticalJustifyEnd className="h-4 w-4 mr-2" />
                  Align Bottom
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
