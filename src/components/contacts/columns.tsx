import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export interface Contact {
  id: string;
  customer_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  company: string | null;
  job_title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lifecycle_stage: string | null;
  lead_score: number | null;
  engagement_score: number | null;
  lead_source: string | null;
  last_activity_date: string | null;
  created_at: string | null;
}

export const createColumns = (
  onSelectionChange: (selectedIds: string[]) => void
): ColumnDef<Contact>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "customer_code",
    accessorKey: "customer_code",
    header: "Code",
    cell: ({ row }) => row.getValue("customer_code") || "-",
    enableHiding: false, // Required column
  },
  {
    id: "name",
    accessorFn: (row) => {
      const first = row.first_name || "";
      const last = row.last_name || "";
      return `${first} ${last}`.trim() || "-";
    },
    header: "Name",
    enableHiding: false, // Required column
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.getValue("email") || "-",
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.getValue("phone") || "-",
  },
  {
    id: "mobile_phone",
    accessorKey: "mobile_phone",
    header: "Mobile Phone",
    cell: ({ row }) => row.getValue("mobile_phone") || "-",
  },
  {
    id: "company",
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => row.getValue("company") || "-",
  },
  {
    id: "job_title",
    accessorKey: "job_title",
    header: "Job Title",
    cell: ({ row }) => row.getValue("job_title") || "-",
  },
  {
    id: "address",
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => row.getValue("address") || "-",
  },
  {
    id: "city",
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => row.getValue("city") || "-",
  },
  {
    id: "state",
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => row.getValue("state") || "-",
  },
  {
    id: "lifecycle_stage",
    accessorKey: "lifecycle_stage",
    header: "Lifecycle Stage",
    cell: ({ row }) => {
      const stage = row.getValue("lifecycle_stage") as string | null;
      if (!stage) return "-";
      
      const colors: Record<string, string> = {
        lead: "bg-blue-500/10 text-blue-500",
        mql: "bg-purple-500/10 text-purple-500",
        sql: "bg-indigo-500/10 text-indigo-500",
        opportunity: "bg-orange-500/10 text-orange-500",
        customer: "bg-green-500/10 text-green-500",
        evangelist: "bg-pink-500/10 text-pink-500",
      };
      
      return (
        <Badge variant="outline" className={colors[stage] || ""}>
          {stage.toUpperCase()}
        </Badge>
      );
    },
  },
  {
    id: "lead_score",
    accessorKey: "lead_score",
    header: "Lead Score",
    cell: ({ row }) => {
      const score = row.getValue("lead_score") as number | null;
      if (score === null) return "-";
      
      let color = "text-muted-foreground";
      if (score >= 80) color = "text-green-500 font-semibold";
      else if (score >= 50) color = "text-orange-500 font-medium";
      else color = "text-red-500";
      
      return <span className={color}>{score}</span>;
    },
  },
  {
    id: "engagement_score",
    accessorKey: "engagement_score",
    header: "Engagement Score",
    cell: ({ row }) => {
      const score = row.getValue("engagement_score") as number | null;
      if (score === null) return "-";
      
      let color = "text-muted-foreground";
      if (score >= 80) color = "text-green-500 font-semibold";
      else if (score >= 50) color = "text-orange-500 font-medium";
      else color = "text-red-500";
      
      return <span className={color}>{score}</span>;
    },
  },
  {
    id: "lead_source",
    accessorKey: "lead_source",
    header: "Lead Source",
    cell: ({ row }) => row.getValue("lead_source") || "-",
  },
  {
    id: "last_activity_date",
    accessorKey: "last_activity_date",
    header: "Last Activity",
    cell: ({ row }) => {
      const date = row.getValue("last_activity_date") as string | null;
      if (!date) return "-";
      return format(new Date(date), "MMM d, yyyy");
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: "Created Date",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string | null;
      if (!date) return "-";
      return format(new Date(date), "MMM d, yyyy");
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link to={`/contacts/${row.original.id}`}>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
