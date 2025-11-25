import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  { id: "lead_source", label: "Lead Source" },
  { id: "last_activity_date", label: "Last Activity" },
  { id: "created_at", label: "Created Date" },
];

interface ColumnSelectorProps {
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

export function ColumnSelector({ visibleColumns, onColumnsChange }: ColumnSelectorProps) {
  const handleToggle = (columnId: string, checked: boolean) => {
    if (checked) {
      onColumnsChange([...visibleColumns, columnId]);
    } else {
      onColumnsChange(visibleColumns.filter(id => id !== columnId));
    }
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
            checked={visibleColumns.includes(column.id)}
            onCheckedChange={(checked) => handleToggle(column.id, checked)}
            disabled={column.required}
          >
            {column.label}
            {column.required && <span className="ml-2 text-xs text-muted-foreground">(required)</span>}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {visibleColumns.length} columns visible
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
