/**
 * ViewModeToggle - Switch between grid, table, and category views
 */

import { LayoutGrid, List, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export type ViewMode = "grid" | "table" | "category";

interface ViewModeToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewModeToggle({ currentView, onViewChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3",
          currentView === "grid" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => onViewChange("grid")}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3",
          currentView === "table" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => onViewChange("table")}
        title="Table View"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3",
          currentView === "category" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => onViewChange("category")}
        title="Category View"
      >
        <FolderTree className="h-4 w-4" />
      </Button>
    </div>
  );
}

