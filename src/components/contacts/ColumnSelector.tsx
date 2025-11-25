import { useState, useEffect, useCallback, useRef } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table } from "@tanstack/react-table";

interface ColumnSelectorProps {
  table: Table<any>;
  onVisibilityChange?: (columnId: string, isVisible: boolean) => void;
}

export function ColumnSelector({ table, onVisibilityChange }: ColumnSelectorProps) {
  const columns = table.getAllColumns().filter(
    (column) => column.getCanHide()
  );

  // Local state for immediate UI feedback
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with table state
  useEffect(() => {
    const visibility: Record<string, boolean> = {};
    columns.forEach((col) => {
      visibility[col.id] = col.getIsVisible();
    });
    setLocalVisibility(visibility);
  }, [columns.map(c => c.getIsVisible()).join(',')]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced persistence handler
  const debouncedToggle = useCallback((columnId: string, newValue: boolean) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const column = table.getAllColumns().find(col => col.id === columnId);
      if (column) {
        column.toggleVisibility(newValue);
        onVisibilityChange?.(columnId, newValue);
      }
    }, 300);
  }, [table, onVisibilityChange]);

  const handleToggle = (columnId: string, newValue: boolean) => {
    // Immediate local update for responsive UI
    setLocalVisibility(prev => ({ ...prev, [columnId]: newValue }));
    // Debounced actual toggle
    debouncedToggle(columnId, newValue);
  };

  const visibleCount = Object.values(localVisibility).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {columns.map((column) => {
          const columnDef = column.columnDef as any;
          const isRequired = columnDef.enableHiding === false;
          const isVisible = localVisibility[column.id] ?? column.getIsVisible();
          
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={isVisible}
              onCheckedChange={(value) => handleToggle(column.id, !!value)}
              onSelect={(e) => e.preventDefault()}
              disabled={isRequired}
            >
              {column.id === "customer_code" && "Code"}
              {column.id === "name" && "Name"}
              {column.id === "email" && "Email"}
              {column.id === "phone" && "Phone"}
              {column.id === "mobile_phone" && "Mobile Phone"}
              {column.id === "company" && "Company"}
              {column.id === "job_title" && "Job Title"}
              {column.id === "address" && "Address"}
              {column.id === "city" && "City"}
              {column.id === "state" && "State"}
              {column.id === "lifecycle_stage" && "Lifecycle Stage"}
              {column.id === "lead_score" && "Lead Score"}
              {column.id === "engagement_score" && "Engagement Score"}
              {column.id === "lead_source" && "Lead Source"}
              {column.id === "last_activity_date" && "Last Activity"}
              {column.id === "created_at" && "Created Date"}
              {isRequired && <span className="ml-2 text-xs text-muted-foreground">(required)</span>}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {visibleCount} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
