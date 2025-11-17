import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Upload, Download, Users } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useContacts } from "@/hooks/useContacts";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactQuickCreate } from "@/components/contacts/ContactQuickCreate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Contacts() {
  const { currentClient } = useTenant();
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: contacts, isLoading } = useContacts(currentClient?.id || null, {
    search,
    lifecycle_stage: lifecycleFilter || undefined,
  });

  const lifecycleStages = [
    { value: "subscriber", label: "Subscriber" },
    { value: "lead", label: "Lead" },
    { value: "mql", label: "Marketing Qualified Lead" },
    { value: "sql", label: "Sales Qualified Lead" },
    { value: "opportunity", label: "Opportunity" },
    { value: "customer", label: "Customer" },
    { value: "evangelist", label: "Evangelist" },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground mt-2">
              Manage your contact database and customer relationships
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                  <p className="text-2xl font-bold">{contacts?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold">
                    {contacts?.filter(c => c.lifecycle_stage === "lead").length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Opportunities</p>
                  <p className="text-2xl font-bold">
                    {contacts?.filter(c => c.lifecycle_stage === "opportunity").length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">
                    {contacts?.filter(c => c.lifecycle_stage === "customer").length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Stages</SelectItem>
                  {lifecycleStages.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact List */}
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="mt-6">
            <ContactsTable contacts={contacts || []} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="grid" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Grid view coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ContactQuickCreate
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        clientId={currentClient?.id || ""}
      />
    </Layout>
  );
}
