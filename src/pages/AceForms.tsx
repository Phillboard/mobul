import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Copy, Trash2, Edit, Eye, BarChart3, Code2, MoreVertical, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryHeader } from "@/components/shared/LibraryHeader";
import { LibrarySearch } from "@/components/shared/LibrarySearch";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { LibraryEmptyState } from "@/components/shared/LibraryEmptyState";
import { AceFormsFilters } from "@/features/ace-forms/components";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAceForms } from "@/hooks/useAceForms";
import { useTenant } from "@/contexts/TenantContext";
import { FormEmbedDialog } from "@/features/ace-forms/components";
import { Layout } from "@/components/layout/Layout";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Ace Forms - List and manage all forms
 */
export default function AceForms() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { forms, isLoading, deleteForm, duplicateForm } = useAceForms(currentClient?.id);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [embedFormId, setEmbedFormId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draftFilter, setDraftFilter] = useState("all");

  const filteredForms = forms?.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && form.is_active) ||
      (statusFilter === "inactive" && !form.is_active);
    const matchesDraft = draftFilter === "all" ||
      (draftFilter === "published" && !form.is_draft) ||
      (draftFilter === "draft" && form.is_draft);
    return matchesSearch && matchesStatus && matchesDraft;
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
      <LibraryHeader
        title="Ace Forms"
        subtitle="AI-powered form builder for gift card redemption"
        createButtonText="Create Form"
        onCreateClick={() => navigate("/ace-forms/new")}
      />

      <div className="flex gap-4 items-center">
        <LibrarySearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search forms..."
        />
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <AceFormsFilters
        selectedStatus={statusFilter}
        selectedDraft={draftFilter}
        onStatusChange={setStatusFilter}
        onDraftChange={setDraftFilter}
        onClearFilters={() => {
          setStatusFilter("all");
          setDraftFilter("all");
        }}
      />

      {/* Forms Grid */}
      {!filteredForms || filteredForms.length === 0 ? (
        <LibraryEmptyState
          icon={FileText}
          title="No forms found"
          message={searchQuery ? `No forms match "${searchQuery}"` : "Create your first form to get started"}
          actionLabel="Create Form"
          onAction={() => navigate("/ace-forms/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {form.name}
                      {form.is_draft && (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {form.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant={form.is_active ? "default" : "secondary"}>
                    {form.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{form.total_views || 0} views</span>
                    <span>{form.total_submissions || 0} submissions</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/ace-forms/${form.id}/builder`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`/forms/${form.id}`, '_blank')}>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/ace-forms/${form.id}/analytics`)}>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEmbedFormId(form.id)}>
                          <Code2 className="w-4 h-4 mr-2" />
                          Embed Code
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateForm.mutate(form.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(form.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Embed Code Dialog */}
      {embedFormId && (
        <FormEmbedDialog
          open={!!embedFormId}
          onOpenChange={(open) => !open && setEmbedFormId(null)}
          formId={embedFormId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteForm.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
}
