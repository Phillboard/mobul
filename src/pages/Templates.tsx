import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { TemplateGrid } from "@/components/templates/TemplateGrid";
import { TemplateFilters } from "@/components/templates/TemplateFilters";
import { TemplateSearch } from "@/components/templates/TemplateSearch";
import { ViewToggle } from "@/components/templates/ViewToggle";
import { BulkActions } from "@/components/templates/BulkActions";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Templates() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { currentClient } = useTenant();

  const { data: templates } = useQuery({
    queryKey: ["templates", currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      const { data } = await supabase
        .from("templates")
        .select("*")
        .eq("client_id", currentClient.id);
      return data || [];
    },
    enabled: !!currentClient?.id,
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (!currentClient) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to view templates
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Template Library
            </h1>
            <p className="text-muted-foreground mt-2">
              Create stunning direct mail designs with our visual editor
            </p>
          </div>
          <Button 
            variant="neon"
            onClick={() => setCreateDialogOpen(true)} 
            className="shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        <Card variant="glass" hover="lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-3">
              <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
              <ViewToggle view={view} onViewChange={setView} />
            </div>
            <TemplateFilters
          selectedCategory={selectedCategory}
          selectedFormat={selectedFormat}
          onCategoryChange={setSelectedCategory}
              onFormatChange={setSelectedFormat}
              onClearFilters={() => {
                setSelectedCategory("all");
                setSelectedFormat("all");
              }}
            />
          </CardContent>
        </Card>

        <TemplateGrid
          clientId={currentClient.id}
          sizeFilter={selectedFormat}
          industryFilter={selectedCategory}
          searchQuery={searchQuery}
          view={view}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />

        <BulkActions
          selectedIds={selectedIds}
          templates={templates || []}
          onClearSelection={() => setSelectedIds([])}
        />

        {/* Floating Action Button for Mobile */}
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          size="icon"
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl sm:hidden z-40 hover:scale-110 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <CreateTemplateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clientId={currentClient.id}
        />
      </div>
    </Layout>
  );
}
