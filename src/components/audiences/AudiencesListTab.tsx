import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createAudiencesColumns } from "./audiencesColumns";
import { basicTableModels } from "@/lib/tableHelpers";

export function AudiencesListTab() {
  const { currentClient } = useTenant();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true }
  ]);

  const { data: audiences, isLoading } = useQuery({
    queryKey: ['audiences', currentClient?.id],
    queryFn: async () => {
      if (!currentClient) return [];
      
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentClient,
  });

  const columns = useMemo(
    () => createAudiencesColumns((id) => navigate(`/audiences/${id}`)),
    [navigate]
  );

  const table = useReactTable({
    data: audiences || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    ...basicTableModels,
  });

  if (!currentClient) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Please select a client from the sidebar to view audiences
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!audiences || audiences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No audiences yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Import your first contact list or purchase leads to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-2"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {typeof header.column.columnDef.header === "function"
                          ? header.column.columnDef.header(header.getContext())
                          : header.column.columnDef.header}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/audiences/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {typeof cell.column.columnDef.cell === "function"
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.renderValue()}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No audiences found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
