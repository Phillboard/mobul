import { useState } from "react";
import { Plus, Database, Upload, Download } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactQuickCreate } from "@/components/contacts/ContactQuickCreate";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { SmartCSVImporter } from "@/components/contacts/SmartCSVImporter";
import { ExportButton } from "@/components/contacts/ExportButton";
import { useTenant } from "@/contexts/TenantContext";
import { useContacts } from "@/hooks/useContacts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { seedContactsData } from '@/lib/demo/seed-contacts-data';
import { CSVTemplateGenerator } from "@/lib/utils/csvTemplates";
import { toast } from "sonner";
import type { ContactFilters as ContactFiltersType } from "@/types/contacts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Contacts() {
  const { currentClient } = useTenant();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ContactFiltersType>({});
  const [isSeeding, setIsSeeding] = useState(false);

  const appliedFilters: ContactFiltersType = {
    ...filters,
    search: searchQuery || undefined,
  };

  const { data: contacts } = useContacts(appliedFilters);

  const handleSeedData = async () => {
    if (!currentClient) return;
    
    setIsSeeding(true);
    try {
      await seedContactsData(currentClient.id);
      toast.success("Dummy data created successfully! Refresh the page to see the data.");
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Failed to create dummy data. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = CSVTemplateGenerator.generateTemplate({
      includeExamples: true,
      includeOptionalFields: true,
    });
    CSVTemplateGenerator.downloadTemplate('contacts-import-template.csv', template);
    toast.success('Template downloaded');
  };

  const handleImportComplete = () => {
    setImportDialogOpen(false);
    toast.success('Import completed! Refreshing contacts...');
    // The table will auto-refresh via the query invalidation in the import function
  };

  if (!currentClient) {
    return (
      <Layout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a client to view contacts.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your customer database
              {contacts && contacts.length > 0 && ` • ${contacts.length} total`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Sample CSV
            </Button>
            {contacts && contacts.length > 0 && (
              <ExportButton
                contacts={contacts}
                variant="outline"
                size="sm"
              />
            )}
            <Button 
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSeedData}
              disabled={isSeeding}
            >
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? "Creating..." : "Demo Data"}
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ContactFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </Card>

        {/* Contacts Table */}
        <ContactsTable filters={appliedFilters} onFiltersChange={setFilters} />

        {/* Create Dialog */}
        <ContactQuickCreate
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Contacts</DialogTitle>
              <DialogDescription>
                Upload a CSV file to import contacts. We'll automatically detect and validate unique codes.
              </DialogDescription>
            </DialogHeader>
            <SmartCSVImporter
              onImportComplete={handleImportComplete}
              onCancel={() => setImportDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
