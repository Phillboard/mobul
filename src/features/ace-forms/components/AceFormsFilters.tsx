import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Filter, CheckCircle, FileEdit } from "lucide-react";

interface AceFormsFiltersProps {
  selectedStatus: string;
  selectedDraft: string;
  onStatusChange: (status: string) => void;
  onDraftChange: (draft: string) => void;
  onClearFilters: () => void;
}

export function AceFormsFilters({
  selectedStatus,
  selectedDraft,
  onStatusChange,
  onDraftChange,
  onClearFilters,
}: AceFormsFiltersProps) {
  const hasActiveFilters = selectedStatus !== "all" || selectedDraft !== "all";

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
            <CheckCircle className="h-3 w-3" />
            Status
          </Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <FileEdit className="h-3 w-3" />
            Draft Status
          </Label>
          <Select value={selectedDraft} onValueChange={onDraftChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
