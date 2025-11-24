import { useDocumentation } from "@/hooks/useDocumentation";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { EditDocDialog } from "./EditDocDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categoryLabels: Record<string, string> = {
  "getting-started": "Getting Started",
  "architecture": "Architecture",
  "features": "Features",
  "developer-guide": "Developer Guide",
  "api-reference": "API Reference",
  "user-guides": "User Guides",
  "operations": "Operations",
  "configuration": "Configuration",
  "reference": "Reference",
};

export function AdminDocsList() {
  const { data: docs, isLoading, refetch } = useDocumentation();
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deletingDoc) return;

    const { error } = await supabase
      .from("documentation_pages")
      .delete()
      .eq("id", deletingDoc.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete documentation page",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Documentation page deleted successfully",
    });
    setDeletingDoc(null);
    refetch();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Manage Documentation</h2>
          <Button onClick={() => setEditingDoc({})}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.title}</TableCell>
                <TableCell>{categoryLabels[doc.category] || doc.category}</TableCell>
                <TableCell>
                  <code className="text-xs">{doc.slug}</code>
                </TableCell>
                <TableCell>{doc.order_index}</TableCell>
                <TableCell>
                  {doc.is_admin_only && (
                    <Badge variant="secondary">Admin Only</Badge>
                  )}
                  {!doc.content && (
                    <Badge variant="outline">No Content</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingDoc(doc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingDoc(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingDoc && (
        <EditDocDialog
          doc={editingDoc}
          open={!!editingDoc}
          onOpenChange={(open) => !open && setEditingDoc(null)}
          onSuccess={() => {
            setEditingDoc(null);
            refetch();
          }}
        />
      )}

      <AlertDialog open={!!deletingDoc} onOpenChange={() => setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Documentation Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDoc?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
