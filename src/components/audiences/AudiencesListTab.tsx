import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactTable, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createAudiencesColumns } from "./audiencesColumns";
import { basicTableModels } from "@/lib/utils/tableHelpers";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";

export function AudiencesListTab() {
  const { currentClient } = useTenant();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
      <CardContent className="space-y-4">
        <DataTableToolbar
          table={table}
          searchKey="name"
          searchPlaceholder="Search audiences..."
        >
          <DataTableViewOptions table={table} />
        </DataTableToolbar>
        
        <DataTable table={table} />
        
        <DataTablePagination table={table} />
      </CardContent>
    </Card>
  );
}
