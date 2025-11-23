import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Globe, MoreVertical, Edit, Trash2, Eye, Copy, Sparkles, Palette } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useLandingPages } from "@/hooks/useLandingPages";
import { usePermissions } from "@/hooks/usePermissions";
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
import { AIGenerationDialog } from "@/components/landing-pages/AIGenerationDialog";
import { IndustryTemplateSelector } from "@/components/landing-pages/IndustryTemplateSelector";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPages() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { canCreate, canEdit, canDelete } = usePermissions("landingpages");
  const { pages, isLoading, deletePage, publishPage } = useLandingPages(currentClient?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  const filteredPages = pages?.filter((page) =>
    page.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    if (page.editor_type === 'visual') {
      navigate(`/landing-pages/${page.id}/visual-editor`);
    } else {
      navigate(`/landing-pages/${page.id}/edit`);
    }
  };

  const handleCreateWithAI = async () => {
    if (!currentClient) return;
    
    const { data: newPage, error } = await supabase
      .from('landing_pages')
      .insert({
        client_id: currentClient.id,
        name: 'New AI Landing Page',
        slug: `ai-page-${Date.now()}`,
        published: false,
        content_json: {},
        html_content: '',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create landing page');
      return;
    }

    if (newPage) {
      navigate(`/landing-pages/${newPage.id}/ai-editor`);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
              <Globe className="h-8 w-8" />
              Landing Pages
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage landing pages for gift card redemption
            </p>
          </div>
          {canCreate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="neon">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Landing Page
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => setTemplateSelectorOpen(true)}>
                  <Globe className="h-4 w-4 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Industry Templates</div>
                    <div className="text-xs text-muted-foreground">
                      Professional templates for your industry
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAiDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium">Generate with AI</div>
                    <div className="text-xs text-muted-foreground">
                      AI creates branded page instantly
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateWithAI}>
                  <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                  <div>
                    <div className="font-medium">AI Chat Editor</div>
                    <div className="text-xs text-muted-foreground">
                      Design with conversational AI
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/landing-pages/new/visual-editor")}>
                  <Palette className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium">Visual Editor</div>
                    <div className="text-xs text-muted-foreground">
                      Design with drag-and-drop builder
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search landing pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : filteredPages?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No landing pages yet. Create your first one to get started.
              </p>
              {canCreate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Landing Page
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setAiDialogOpen(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Generate with AI</div>
                        <div className="text-xs text-muted-foreground">
                          AI creates branded page instantly
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/landing-pages/new/visual-editor")}>
                      <Palette className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">Visual Editor</div>
                        <div className="text-xs text-muted-foreground">
                          Design with drag-and-drop builder
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
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
                            <DropdownMenuItem onClick={() => navigate(`/landing-pages/${page.id}/ai-editor`)}>
                              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                              Edit with AI Chat
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

        <AIGenerationDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          onSuccess={(pageId) => navigate(`/landing-pages/${pageId}/edit`)}
          clientId={currentClient?.id || ''}
        />

        <IndustryTemplateSelector
          open={templateSelectorOpen}
          onOpenChange={setTemplateSelectorOpen}
          onSelectTemplate={async (templateId) => {
            if (!currentClient) return;
            
            const template = Object.values(industryTemplates).find(t => t.id === templateId);
            if (!template) return;

            // Create landing page with template
            const { data: newPage, error } = await supabase
              .from('landing_pages')
              .insert({
                client_id: currentClient.id,
                name: template.name,
                slug: `${templateId}-${Date.now()}`,
                published: false,
                html_content: template.generateHTML({
                  companyName: currentClient.name,
                  industry: template.industry,
                  ...template.defaultValues,
                  logoUrl: currentClient.logo_url,
                  primaryColor: template.defaultValues.primaryColor || '#6366f1',
                  accentColor: template.defaultValues.accentColor || '#8b5cf6',
                  backgroundColor: '#ffffff',
                  textColor: '#1f2937',
                  giftCardBrand: 'Amazon',
                  giftCardValue: '50',
                } as any),
                editor_type: 'visual',
                version_number: 1,
              })
              .select()
              .single();

            if (error) {
              toast.error('Failed to create landing page from template');
              return;
            }

            if (newPage) {
              toast.success('Landing page created from template!');
              navigate(`/landing-pages/${newPage.id}/visual-editor`);
            }
          }}
          clientData={{
            companyName: currentClient?.name || 'Your Company',
            industry: currentClient?.industry,
            logoUrl: currentClient?.logo_url || undefined,
          }}
        />
      </div>
    </Layout>
  );
}

import { industryTemplates } from "@/lib/industryLandingTemplates";
