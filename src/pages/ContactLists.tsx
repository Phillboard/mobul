import { useState, useMemo } from "react";
import { Plus, List, Filter } from "lucide-react";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ListBuilder } from "@/features/contacts/components/ListBuilder";
import { SegmentBuilder } from "@/features/contacts/components/SegmentBuilder";
import { useContactLists } from '@/features/contacts/hooks';
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTablePagination } from "@/shared/components/ui/data-table-pagination";
import { DataTableToolbar } from "@/shared/components/ui/data-table-toolbar";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import { createContactListColumns, ContactListRow } from "@/features/contacts/components/contactListColumns";
import { createSegmentColumns, SegmentRow } from "@/features/contacts/components/segmentColumns";

export default function ContactLists() {
  const navigate = useNavigate();
  const { data: staticLists = [] } = useContactLists("static");
  const { data: segments = [] } = useContactLists("dynamic");
  const [listBuilderOpen, setListBuilderOpen] = useState(false);
  const [segmentBuilderOpen, setSegmentBuilderOpen] = useState(false);
  const [listSorting, setListSorting] = useState<SortingState>([]);
  const [listColumnFilters, setListColumnFilters] = useState<ColumnFiltersState>([]);
  const [segmentSorting, setSegmentSorting] = useState<SortingState>([]);
  const [segmentColumnFilters, setSegmentColumnFilters] = useState<ColumnFiltersState>([]);

  const listColumns = useMemo(
    () =>
      createContactListColumns({
        onView: (id) => navigate(`/contacts/lists/${id}`),
      }),
    [navigate]
  );

  const segmentColumns = useMemo(
    () =>
      createSegmentColumns({
        onView: (id) => navigate(`/contacts/segments/${id}`),
      }),
    [navigate]
  );

  const listsTable = useReactTable({
    data: staticLists as ContactListRow[],
    columns: listColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setListSorting,
    onColumnFiltersChange: setListColumnFilters,
    state: {
      sorting: listSorting,
      columnFilters: listColumnFilters,
    },
  });

  const segmentsTable = useReactTable({
    data: segments as SegmentRow[],
    columns: segmentColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSegmentSorting,
    onColumnFiltersChange: setSegmentColumnFilters,
    state: {
      sorting: segmentSorting,
      columnFilters: segmentColumnFilters,
    },
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lists & Segments</h1>
            <p className="text-muted-foreground mt-1">
              Organize your contacts into targetable groups
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lists" className="w-full">
          <TabsList>
            <TabsTrigger value="lists">
              <List className="h-4 w-4 mr-2" />
              Lists
            </TabsTrigger>
            <TabsTrigger value="segments">
              <Filter className="h-4 w-4 mr-2" />
              Segments
            </TabsTrigger>
          </TabsList>

          {/* Static Lists Tab */}
          <TabsContent value="lists" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setListBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </div>

            {staticLists.length === 0 ? (
              <EmptyState
                icon={List}
                title="No lists yet"
                description="Create your first static list to organize contacts manually."
                action={{
                  label: "Create List",
                  onClick: () => setListBuilderOpen(true),
                }}
              />
            ) : (
              <div className="space-y-4">
                <DataTableToolbar
                  table={listsTable}
                  searchKey="name"
                  searchPlaceholder="Search lists..."
                >
                  <DataTableViewOptions table={listsTable} />
                </DataTableToolbar>
                <DataTable table={listsTable} />
                <DataTablePagination table={listsTable} />
              </div>
            )}
          </TabsContent>

          {/* Dynamic Segments Tab */}
          <TabsContent value="segments" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setSegmentBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Segment
              </Button>
            </div>

            {segments.length === 0 ? (
              <EmptyState
                icon={Filter}
                title="No segments yet"
                description="Create dynamic segments based on rules and filters."
                action={{
                  label: "Create Segment",
                  onClick: () => setSegmentBuilderOpen(true),
                }}
              />
            ) : (
              <div className="space-y-4">
                <DataTableToolbar
                  table={segmentsTable}
                  searchKey="name"
                  searchPlaceholder="Search segments..."
                >
                  <DataTableViewOptions table={segmentsTable} />
                </DataTableToolbar>
                <DataTable table={segmentsTable} />
                <DataTablePagination table={segmentsTable} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ListBuilder open={listBuilderOpen} onOpenChange={setListBuilderOpen} />
        <SegmentBuilder
          open={segmentBuilderOpen}
          onOpenChange={setSegmentBuilderOpen}
        />
      </div>
    </Layout>
  );
}
