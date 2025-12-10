import { useDocumentation } from '@/features/documentation/hooks';
import { Button } from "@/shared/components/ui/button";
import { Plus, Edit, Trash2, FileText, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { useState } from "react";
import { EditDocDialog } from "./EditDocDialog";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';
import { roleDisplayNames } from '@core/auth/roles';
import type { AppRole } from '@core/auth/roles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

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
  const [editingVisibility, setEditingVisibility] = useState<any>(null);
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
              <TableHead>Visibility</TableHead>
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
                  <div className="flex flex-wrap gap-1">
                    {doc.visible_to_roles?.length === 6 ? (
                      <Badge variant="outline">All Users</Badge>
                    ) : doc.visible_to_roles?.length === 1 && doc.visible_to_roles[0] === 'admin' ? (
                      <Badge variant="secondary">Admin Only</Badge>
                    ) : (
                      <Badge variant="outline">{doc.visible_to_roles?.length || 0} roles</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {!doc.content && (
                    <Badge variant="outline">No Content</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingVisibility(doc)}
                      title="Manage visibility"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
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

      {editingVisibility && (
        <VisibilityEditor
          doc={editingVisibility}
          open={!!editingVisibility}
          onOpenChange={(open) => !open && setEditingVisibility(null)}
          onSuccess={() => {
            setEditingVisibility(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

function VisibilityEditor({ doc, open, onOpenChange, onSuccess }: any) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(doc.visible_to_roles || ['admin']);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const allRoles: AppRole[] = ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'];

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (selectedRoles.length === 0) {
      toast({
        title: "Error",
        description: "At least one role must be selected",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("documentation_pages")
      .update({ visible_to_roles: selectedRoles })
      .eq("id", doc.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update visibility settings",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Visibility settings updated successfully",
    });
    onSuccess();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Manage Document Visibility</AlertDialogTitle>
          <AlertDialogDescription>
            Select which roles can view "{doc.title}"
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {allRoles.map((role) => (
            <div
              key={role}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRoles.includes(role)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleRole(role)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => {}}
                  className="h-4 w-4"
                />
                <div>
                  <div className="font-medium">{roleDisplayNames[role]}</div>
                  <div className="text-xs text-muted-foreground">
                    {role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
