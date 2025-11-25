import { useState, useEffect, useMemo, useRef } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  required?: boolean;
}

const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: "customer_code", label: "Code", required: true },
  { id: "name", label: "Name", required: true },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "mobile_phone", label: "Mobile Phone" },
  { id: "company", label: "Company" },
  { id: "job_title", label: "Job Title" },
  { id: "address", label: "Address" },
  { id: "city", label: "City" },
  { id: "state", label: "State" },
  { id: "lifecycle_stage", label: "Lifecycle Stage" },
  { id: "lead_score", label: "Lead Score" },
  { id: "engagement_score", label: "Engagement Score" },
  { id: "lead_source", label: "Lead Source" },
  { id: "last_activity_date", label: "Last Activity" },
  { id: "created_at", label: "Created Date" },
];

interface ColumnSelectorProps {
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function ColumnSelector({ visibleColumns, onColumnsChange }: ColumnSelectorProps) {
  // Local state for immediate UI feedback
  const [localColumns, setLocalColumns] = useState<string[]>(visibleColumns);
  const isUpdatingRef = useRef(false);

  // Sync local state when prop changes from external source (not our own updates)
  useEffect(() => {
    if (!isUpdatingRef.current) {
      setLocalColumns(visibleColumns);
    }
  }, [visibleColumns]);

  // Debounced save to database
  const debouncedSave = useMemo(
    () => debounce((columns: string[]) => {
      onColumnsChange(columns);
      // Clear the updating flag after a delay to allow sync
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 1000);
    }, 500),
    [onColumnsChange]
  );

  const handleToggle = (columnId: string, checked: boolean) => {
    isUpdatingRef.current = true;
    const newColumns = checked
      ? [...localColumns, columnId]
      : localColumns.filter(id => id !== columnId);
    
    // Update local state immediately
    setLocalColumns(newColumns);
    
    // Debounced save to database
    debouncedSave(newColumns);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {AVAILABLE_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={localColumns.includes(column.id)}
            onCheckedChange={(checked) => handleToggle(column.id, checked)}
            onSelect={(e) => e.preventDefault()}
            disabled={column.required}
          >
            {column.label}
            {column.required && <span className="ml-2 text-xs text-muted-foreground">(required)</span>}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {localColumns.length} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
