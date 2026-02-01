import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Filter } from "lucide-react";

interface FormsFiltersProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
}

export function FormsFilters({
  selectedStatus,
  onStatusChange,
  onClearFilters,
}: FormsFiltersProps) {
  const hasActiveFilters = selectedStatus !== "all";

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-xs">
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
