import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { LibraryHeader } from "@/shared/components/LibraryHeader";
import { LibrarySearch } from "@/shared/components/LibrarySearch";
import { ViewToggle } from "@/shared/components/ViewToggle";
import { LibraryEmptyState } from "@/shared/components/LibraryEmptyState";
import { LandingPageFilters } from "@/features/landing-pages/components/LandingPageFilters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Plus, Globe, MoreVertical, Edit, Trash2, Eye, Copy, Sparkles, Palette } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useLandingPages } from '@/features/landing-pages/hooks';
import { usePermissions } from '@/core/auth/hooks';
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPages() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { canCreate, canEdit, canDelete } = usePermissions("landingpages");
  const { pages, isLoading, deletePage, publishPage } = useLandingPages(currentClient?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editorFilter, setEditorFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  const filteredPages = pages?.filter((page) => {
    const matchesSearch = page.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "published" && page.published) || 
      (statusFilter === "draft" && !page.published);
    const matchesEditor = editorFilter === "all" || 
      (editorFilter === "visual" && page.editor_type !== "ai") || 
      (editorFilter === "ai" && page.editor_type === "ai");
    return matchesSearch && matchesStatus && matchesEditor;
  });

  const handleDelete = () => {
    if (pageToDelete) {
      deletePage.mutate(pageToDelete);
      setDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };

  const handleTogglePublish = (id: string, currentStatus: boolean) => {
    publishPage.mutate({ id, published: !currentStatus });
  };

  const handleEdit = (page: any) => {
    navigate(`/landing-pages/${page.id}/editor`);
  };


  if (!currentClient) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select a client</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {canCreate && (
          <LibraryHeader
            title="Landing Pages"
            subtitle="Create and manage landing pages with AI or visual editor"
            createButtonText="Create Landing Page"
            onCreateClick={() => navigate("/landing-pages/create")}
          />
        )}

        <div className="flex gap-4 items-center">
          <LibrarySearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search landing pages..."
          />
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        <LandingPageFilters
          selectedStatus={statusFilter}
          selectedEditor={editorFilter}
          onStatusChange={setStatusFilter}
          onEditorChange={setEditorFilter}
          onClearFilters={() => {
            setStatusFilter("all");
            setEditorFilter("all");
          }}
        />

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : filteredPages?.length === 0 ? (
          <LibraryEmptyState
            icon={Globe}
            title="No landing pages found"
            message={searchQuery ? `No landing pages match "${searchQuery}"` : "Create your first AI-powered landing page in seconds"}
            actionLabel="Create Landing Page"
            onAction={() => navigate("/landing-pages/create")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPages?.map((page) => (
              <Card key={page.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{page.name}</CardTitle>
                      <CardDescription className="mt-1">
                        /{page.slug}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(page)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => window.open(`/p/${page.slug}`, "_blank")}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Live Page
                        </DropdownMenuItem>
                        {canCreate && (
                          <DropdownMenuItem onClick={() => navigate(`/landing-pages/new?clone=${page.id}`)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => handleTogglePublish(page.id, page.published)}>
                            {page.published ? "Unpublish" : "Publish"}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setPageToDelete(page.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge variant={page.published ? "default" : "secondary"}>
                      {page.published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant={page.editor_type === 'ai' ? 'outline' : 'outline'} className="gap-1">
                      {page.editor_type === 'ai' ? (
                        <>
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </>
                      ) : (
                        <>
                          <Palette className="h-3 w-3" />
                          Visual Editor
                        </>
                      )}
                    </Badge>
                  </div>
                  {page.html_content && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mb-3"
                      onClick={() => window.open(`/p/${page.slug}`, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Live Page
                    </Button>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Version {page.version_number}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this landing page? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}


