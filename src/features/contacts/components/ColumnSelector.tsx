import { Settings2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Table } from "@tanstack/react-table";

interface ColumnSelectorProps {
  table: Table<any>;
}

export function ColumnSelector({ table }: ColumnSelectorProps) {
  const columns = table.getAllColumns().filter(
    (column) => column.getCanHide()
  );

  const visibleCount = columns.filter((col) => col.getIsVisible()).length;

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
          
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
