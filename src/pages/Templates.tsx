import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TemplateGrid } from "@/components/templates/TemplateGrid";
import { TemplateFilters } from "@/components/templates/TemplateFilters";
import { CreateTemplateDialog } from "@/components/templates/CreateTemplateDialog";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Templates() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const { currentClient } = useTenant();

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Template Library</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your direct mail templates with our visual canvas editor
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Template
          </Button>
        </div>

        <TemplateFilters
          selectedSize={selectedSize}
          selectedIndustry={selectedIndustry}
          onSizeChange={setSelectedSize}
          onIndustryChange={setSelectedIndustry}
        />

        <TemplateGrid
          clientId={currentClient.id}
          sizeFilter={selectedSize}
          industryFilter={selectedIndustry}
        />

        <CreateTemplateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clientId={currentClient.id}
        />
      </div>
    </Layout>
  );
}
