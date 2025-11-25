import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useTenant } from "@/contexts/TenantContext";
import { MailSearch } from "@/components/mail/MailSearch";
import { ViewToggle } from "@/components/mail/ViewToggle";
import { MailFilters } from "@/components/mail/MailFilters";
import { TemplateGrid as MailGrid } from "@/components/templates/TemplateGrid";
import { BulkActions } from "@/components/mail/BulkActions";
import { CreateTemplateDialog as CreateMailDialog } from "@/components/templates/CreateTemplateDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Mail() {
  const { currentClient } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: mailPieces } = useQuery({
    queryKey: ["mail", currentClient?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("client_id", currentClient!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentClient?.id,
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => setSelectedIds([]);

  const handleClearFilters = () => {
    setSelectedCategory("all");
    setSelectedFormat("all");
  };

  if (!currentClient) {
    return (
      <Layout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to view mail pieces.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mail Library</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage direct mail designs
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Mail Piece
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <MailSearch value={searchQuery} onChange={setSearchQuery} />
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        <MailFilters
          selectedCategory={selectedCategory}
          selectedFormat={selectedFormat}
          onCategoryChange={setSelectedCategory}
          onFormatChange={setSelectedFormat}
          onClearFilters={handleClearFilters}
        />

        {/* Mail Grid */}
        <MailGrid
          clientId={currentClient.id}
          searchQuery={searchQuery}
          sizeFilter={selectedFormat}
          industryFilter={selectedCategory}
          view={view}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />

        {/* Bulk Actions */}
        <BulkActions
          selectedIds={selectedIds}
          mailPieces={mailPieces || []}
          onClearSelection={handleClearSelection}
        />

        {/* Mobile FAB */}
        <Button
          size="lg"
          className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-2xl md:hidden z-50"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Create Dialog */}
        <CreateMailDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clientId={currentClient.id}
        />
      </div>
    </Layout>
  );
}
