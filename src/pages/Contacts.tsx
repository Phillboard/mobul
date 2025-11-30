import { useState } from "react";
import { Plus, Database } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactQuickCreate } from "@/components/contacts/ContactQuickCreate";
import { ContactFilters } from "@/components/contacts/ContactFilters";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { seedContactsData } from '@/lib/demo/seed-contacts-data';
import { toast } from "sonner";
import type { ContactFilters as ContactFiltersType } from "@/types/contacts";

export default function Contacts() {
  const { currentClient } = useTenant();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ContactFiltersType>({});
  const [isSeeding, setIsSeeding] = useState(false);

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

  const appliedFilters: ContactFiltersType = {
    ...filters,
    search: searchQuery || undefined,
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your customer database
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSeedData}
              disabled={isSeeding}
            >
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? "Creating..." : "Seed Demo Data"}
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
      </div>
    </Layout>
  );
}
