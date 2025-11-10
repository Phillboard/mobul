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
    <div className="border-b border-border bg-builder-sidebar px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          title="Back to templates"
          className="hover:bg-builder-tool-active hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <div>
          <h1 className="text-lg font-bold">{templateName}</h1>
          {lastSaved && (
            <p className="text-xs text-muted-foreground font-medium">
              {isSaving ? "💾 Saving..." : `✓ Last saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`}
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
              className="hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onRedo} 
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        
        <Button 
          variant="outline" 
          onClick={onSave} 
          disabled={isSaving}
          className="hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all font-semibold"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button 
          onClick={onPreview}
          className="bg-builder-tool-active hover:bg-builder-tool-active/90 text-white font-semibold shadow-md hover:shadow-lg transition-all"
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </div>
    </div>
  );
}
