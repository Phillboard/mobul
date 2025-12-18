/**
 * Content Library Page
 * 
 * Manage email and SMS templates with full CRUD operations.
 */

import { useState, useMemo } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Plus, Search, Mail, MessageSquare, FileText, MoreVertical, Edit, Copy, Trash2, Eye } from "lucide-react";
import { useMarketingTemplates, useDeleteMarketingTemplate, useDuplicateMarketingTemplate, MarketingTemplate } from "@/features/marketing/hooks/useContentLibrary";
import { TemplateEditorModal } from "@/features/marketing/components/ContentLibrary";
import { toast } from "sonner";

export default function ContentLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "email" | "sms">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<"email" | "sms">("email");
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MarketingTemplate | null>(null);

  const { data: allTemplates = [], isLoading } = useMarketingTemplates();
  const deleteMutation = useDeleteMarketingTemplate();
  const duplicateMutation = useDuplicateMarketingTemplate();

  // Filter templates by type and search
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;
    
    // Filter by tab
    if (activeTab !== "all") {
      templates = templates.filter(t => t.type === activeTab);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.body_text.toLowerCase().includes(query)
      );
    }
    
    return templates;
  }, [allTemplates, activeTab, searchQuery]);

  const emailTemplates = allTemplates.filter(t => t.type === 'email');
  const smsTemplates = allTemplates.filter(t => t.type === 'sms');

  const handleCreateTemplate = (type: "email" | "sms") => {
    setEditorType(type);
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEditTemplate = (template: MarketingTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDuplicateTemplate = async (template: MarketingTemplate) => {
    try {
      await duplicateMutation.mutateAsync(template.id);
      toast.success('Template duplicated successfully');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(templateToDelete.id);
      toast.success('Template deleted successfully');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const openDeleteDialog = (template: MarketingTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content Library</h1>
            <p className="text-muted-foreground">
              Reusable email and SMS templates
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateTemplate("email")}>
                <Mail className="h-4 w-4 mr-2" />
                Email Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateTemplate("sms")}>
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              All {allTemplates.length > 0 && `(${allTemplates.length})`}
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email {emailTemplates.length > 0 && `(${emailTemplates.length})`}
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS {smsTemplates.length > 0 && `(${smsTemplates.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Loading templates...</p>
                </CardContent>
              </Card>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? 'No templates match your search' : 'No templates yet'}
                    </p>
                    {!searchQuery && (
                      <>
                        <p className="text-sm text-muted-foreground mb-6">
                          Create reusable templates for emails and SMS messages
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={() => handleCreateTemplate("email")}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email Template
                          </Button>
                          <Button variant="outline" onClick={() => handleCreateTemplate("sms")}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            SMS Template
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {template.type === 'email' ? (
                            <Mail className="h-5 w-5 text-blue-500" />
                          ) : (
                            <MessageSquare className="h-5 w-5 text-green-500" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {template.type}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(template)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      {template.category && (
                        <p className="text-xs text-muted-foreground mb-2">{template.category}</p>
                      )}
                      {template.type === 'email' && template.subject && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                          Subject: {template.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {template.body_text}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Used {template.usage_count || 0} times</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-0 hover:bg-transparent"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        type={editorType}
        onSave={() => {
          setEditingTemplate(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTemplate}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
