import { ColumnDef } from "@tanstack/react-table";
import { PaginatedUser } from "@/hooks/useManageableUsersPaginated";
import { Badge } from "@/components/ui/badge";
import { roleDisplayNames, roleColors } from '@/lib/auth/roleUtils";
import { formatDistanceToNow } from "date-fns";
import { UserActionMenu } from "./UserActionMenu";
import { CheckCircle2, XCircle } from "lucide-react";

export const userManagementColumns: ColumnDef<PaginatedUser>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => {
      const fullName = row.getValue("full_name") as string | null;
      const email = row.original.email;
      const isActive = row.original.is_active;
      
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className={`font-medium ${!isActive ? "text-muted-foreground" : ""}`}>
              {fullName || email}
            </span>
            {fullName && (
              <span className="text-sm text-muted-foreground">{email}</span>
            )}
          </div>
          {!isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "roles",
    header: "Role",
    cell: ({ row }) => {
      const roles = row.original.roles;
      const primaryRole = roles[0]; // Highest privilege role

      if (!primaryRole) {
        return <Badge variant="outline">No role</Badge>;
      }

      return (
        <div className="flex items-center gap-1">
          <Badge className={roleColors[primaryRole]}>
            {roleDisplayNames[primaryRole]}
          </Badge>
          {roles.length > 1 && (
            <Badge variant="outline" className="text-xs">
              +{roles.length - 1}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "org_names",
    header: "Organization",
    cell: ({ row }) => {
      const orgNames = row.original.org_names;
      
      if (!orgNames || orgNames.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <div className="flex flex-col gap-1">
          <span>{orgNames[0]}</span>
          {orgNames.length > 1 && (
            <span className="text-xs text-muted-foreground">
              +{orgNames.length - 1} more
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "client_names",
    header: "Clients",
    cell: ({ row }) => {
      const clientNames = row.original.client_names;
      
      if (!clientNames || clientNames.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <div className="flex flex-col gap-1">
          <span>{clientNames[0]}</span>
          {clientNames.length > 1 && (
            <span className="text-xs text-muted-foreground">
              +{clientNames.length - 1} more
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      
      return (
        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">Active</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Inactive</span>
            </>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </span>
      );
    },
  },
  {
    id: "actions',
    cell: ({ row }) => {
      const user = row.original;
      
      // Convert to the format expected by UserActionMenu
      const userForMenu = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        roles: user.roles.map((role) => ({ role })),
        organizations: user.org_names.map((name, idx) => ({
          id: user.org_ids[idx],
          name,
        })),
        clients: user.client_names.map((name, idx) => ({
          id: user.client_ids[idx],
          name,
        })),
      };

      return <UserActionMenu user={userForMenu} />;
    },
  },
];
