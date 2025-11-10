import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TopToolbarProps {
  templateName: string;
  onSave: () => void;
  onPreview: () => void;
  onBack: () => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

export function TopToolbar({
  templateName,
  onSave,
  onPreview,
  onBack,
  isSaving,
  lastSaved,
}: TopToolbarProps) {
  return (
    <div className="border-b border-border bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
