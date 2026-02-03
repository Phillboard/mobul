import { useState } from "react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { InviteUserDialog } from "./InviteUserDialog";
import { PendingInvitations } from "./PendingInvitations";
import { UserFilters } from "./UserFilters";
import { useManageableUsersPaginated } from '@/core/auth/hooks';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { Users, Search } from "lucide-react";
import { AppRole } from "@/core/auth/roles";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { userManagementColumns } from "./userManagementColumns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export function TeamSettings() {
  const { roles } = useAuth();
  const { currentOrg, currentClient } = useTenant();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const userRole = roles[0]?.role as AppRole;
  const isAgencyOwner = userRole === 'agency_owner';
  const isCompanyOwner = userRole === 'company_owner';

  // Filter to current org/client for non-admin users
  const orgFilter = isAgencyOwner && currentOrg?.type === 'agency' ? currentOrg.id : null;
  const clientFilter = isCompanyOwner && currentClient ? currentClient.id : null;

  const { data, isLoading } = useManageableUsersPaginated({
    search,
    roleFilter,
    orgFilter,
    clientFilter,
    showInactive,
    page,
    pageSize,
  });

  const table = useReactTable({
    data: data?.users || [],
    columns: userManagementColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages || 0,
  });

  const getDescription = () => {
    if (isAgencyOwner) {
      return `Manage team members across ${currentOrg?.name || 'your agency'}`;
    }
    if (isCompanyOwner) {
      return `Manage your company's team members`;
    }
    return "Manage your team members";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Members
          </h2>
          <p className="text-muted-foreground">
            {getDescription()}
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <PendingInvitations />

      <Card className="p-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <UserFilters
            roleFilter={roleFilter}
            onRoleFilterChange={(role) => {
              setRoleFilter(role);
              setPage(1);
            }}
            orgFilter={null} // Don't show org filter for team settings
            onOrgFilterChange={() => {}}
            clientFilter={null} // Don't show client filter for team settings
            onClientFilterChange={() => {}}
            showInactive={showInactive}
            onShowInactiveChange={(show) => {
              setShowInactive(show);
              setPage(1);
            }}
            hideOrgClientFilters={true}
          />

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className="h-24 text-center"
                    >
                      Loading team members...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className="h-24 text-center"
                    >
                      No team members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalUsers)} of {data.totalUsers} users
                </p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
