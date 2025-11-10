import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye, Undo, Redo, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface TopToolbarProps {
  templateName: string;
  onSave: () => void;
  onPreview: () => void;
  onBack: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function TopToolbar({
  templateName,
  onSave,
  onPreview,
  onBack,
  isSaving,
  lastSaved,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: TopToolbarProps) {
  return (
    <div className="border-b border-border bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} title="Back to templates">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-lg font-semibold">{templateName}</h1>
          {lastSaved && (
            <p className="text-xs text-muted-foreground">
              {isSaving ? "Saving..." : `Last saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onUndo && onRedo && (
          <>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onUndo} 
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onRedo} 
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        
        <Button variant="outline" onClick={onSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </div>
    </div>
  );
}
