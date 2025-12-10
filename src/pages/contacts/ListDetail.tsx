import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useReactTable, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { ArrowLeft, Users, Trash2, UserPlus } from "lucide-react";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useContactList, useListMembers, useRemoveContactFromList, useDeleteContactList } from '@/features/contacts/hooks';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTablePagination } from "@/shared/components/ui/data-table-pagination";
import { DataTableToolbar } from "@/shared/components/ui/data-table-toolbar";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import { createListMembersColumns } from "@/features/contacts/components/listMembersColumns";
import { basicTableModels } from "@/shared/utils/tableHelpers";

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: list, isLoading: listLoading } = useContactList(id);
  const { data: members = [], isLoading: membersLoading } = useListMembers(id);
  const removeContact = useRemoveContactFromList();
  const deleteList = useDeleteContactList();
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleRemoveContact = (contactId: string) => {
    if (!id) return;
    removeContact.mutate({ listId: id, contactId });
  };

  const handleDeleteList = () => {
    if (!id) return;
    deleteList.mutate(id, {
      onSuccess: () => {
        navigate("/contacts/lists");
      },
    });
  };

  // Table columns and instance
  const columns = useMemo(
    () => createListMembersColumns({ onRemove: handleRemoveContact }),
    []
  );

  const table = useReactTable({
    data: members || [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    ...basicTableModels,
  });

  if (listLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!list) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">List not found</h2>
            <p className="text-muted-foreground mt-2">The list you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/contacts/lists")} className="mt-4">
              Back to Lists
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contacts/lists")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{list.name}</h1>
              {list.description && (
                <p className="text-muted-foreground mt-1">{list.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/contacts")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contacts
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete List
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete List?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{list.name}" and remove all contact associations.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              List Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Contacts</div>
                <div className="text-2xl font-bold">{members.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-2xl font-bold">
                  {new Date(list.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="text-2xl font-bold">
                  {new Date(list.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts in List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {membersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No contacts in this list yet. Add contacts from the main contacts page.
              </div>
            ) : (
              <>
                <DataTableToolbar
                  table={table}
                  searchKey="name"
                  searchPlaceholder="Search contacts..."
                >
                  <DataTableViewOptions table={table} />
                </DataTableToolbar>
                
                <DataTable table={table} />
                
                <DataTablePagination table={table} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
