import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Filter, Eye, Palette } from "lucide-react";

interface LandingPageFiltersProps {
  selectedStatus: string;
  selectedEditor: string;
  onStatusChange: (status: string) => void;
  onEditorChange: (editor: string) => void;
  onClearFilters: () => void;
}

export function LandingPageFilters({
  selectedStatus,
  selectedEditor,
  onStatusChange,
  onEditorChange,
  onClearFilters,
}: LandingPageFiltersProps) {
  const hasActiveFilters = selectedStatus !== "all" || selectedEditor !== "all";

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-3 w-3" />
            Status
          </Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-3 w-3" />
            Editor Type
          </Label>
          <Select value={selectedEditor} onValueChange={onEditorChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Editors</SelectItem>
              <SelectItem value="visual">Visual Editor</SelectItem>
              <SelectItem value="ai">AI Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
