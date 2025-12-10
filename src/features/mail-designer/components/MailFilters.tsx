import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { FileText, Calendar, Filter } from "lucide-react";

interface MailFiltersProps {
  selectedCategory: string;
  selectedFormat: string;
  onCategoryChange: (category: string) => void;
  onFormatChange: (format: string) => void;
  onClearFilters: () => void;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "marketing", label: "Marketing" },
  { value: "promotional", label: "Promotional" },
  { value: "seasonal", label: "Seasonal" },
  { value: "event", label: "Event" },
];

const formats = [
  { value: "all", label: "All Formats" },
  { value: "postcard", label: "Postcard (4x6)" },
  { value: "postcard-large", label: "Postcard (6x9)" },
  { value: "letter", label: "Letter (8.5x11)" },
  { value: "flyer", label: "Flyer (5.5x8.5)" },
];

export function MailFilters({
  selectedCategory,
  selectedFormat,
  onCategoryChange,
  onFormatChange,
  onClearFilters,
}: MailFiltersProps) {
  const hasActiveFilters = selectedCategory !== "all" || selectedFormat !== "all";

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
            <FileText className="h-3 w-3" />
            Category
          </Label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Format
          </Label>
          <Select value={selectedFormat} onValueChange={onFormatChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
