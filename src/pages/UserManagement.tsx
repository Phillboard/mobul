import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { InviteUserDialog } from "@/features/settings/components/InviteUserDialog";
import { PendingInvitations } from "@/features/settings/components/PendingInvitations";
import { UserFilters } from "@/features/settings/components/UserFilters";
import { useManageableUsersPaginated } from '@/core/auth/hooks';
import { UserCog, Search } from "lucide-react";
import { AppRole } from "@/core/auth/roleUtils";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { userManagementColumns } from "@/features/settings/components/userManagementColumns";
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

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(null);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCog className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage users, roles, and permissions across the platform
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
                  setPage(1); // Reset to first page on search
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
              orgFilter={orgFilter}
              onOrgFilterChange={(orgId) => {
                setOrgFilter(orgId);
                setPage(1);
              }}
              clientFilter={clientFilter}
              onClientFilterChange={(clientId) => {
                setClientFilter(clientId);
                setPage(1);
              }}
              showInactive={showInactive}
              onShowInactiveChange={(show) => {
                setShowInactive(show);
                setPage(1);
              }}
            />

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : !data?.users.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <>
                <div className="rounded-md border">
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
                      {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1}-
                      {Math.min(page * pageSize, data.totalCount)} of{" "}
                      {data.totalCount} users
                    </span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(data.totalPages, p + 1))
                      }
                      disabled={page === data.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
