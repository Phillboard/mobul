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
import { AudienceImportTab } from "@/components/audiences/AudienceImportTab";
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
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");

  const { data: contacts, isLoading } = useContacts(currentClient?.id || null, {
    search,
    lifecycle_stage: lifecycleFilter === "all" ? undefined : lifecycleFilter,
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
      <div className="space-y-6 animate-fade-in pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Contacts & Audiences</h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Manage contacts, import audiences, and track customer relationships
            </p>
          </div>
          <div className="flex gap-2 flex-wrap hidden sm:flex">
            <Button variant="outline" size="sm" className="h-10" onClick={() => setActiveTab("import")}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="h-10">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="h-10">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts">All Contacts</TabsTrigger>
            <TabsTrigger value="import">Import Audiences</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card variant="glass">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-xl sm:text-2xl font-bold">{contacts?.length || 0}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Leads</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {contacts?.filter(c => c.lifecycle_stage === "lead").length || 0}
                      </p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Opps</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {contacts?.filter(c => c.lifecycle_stage === "opportunity").length || 0}
                      </p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">Customers</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {contacts?.filter(c => c.lifecycle_stage === "customer").length || 0}
                      </p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters & Search */}
            <Card variant="glass">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
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
                      <SelectItem value="all">All Stages</SelectItem>
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
            <ContactsTable contacts={contacts || []} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <AudienceImportTab />
          </TabsContent>
        </Tabs>
        
        {/* Floating Action Button for Mobile */}
        <Button 
          onClick={() => setShowCreateDialog(true)}
          size="icon"
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl sm:hidden z-40 hover:scale-110 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <ContactQuickCreate
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        clientId={currentClient?.id || ""}
      />
    </Layout>
  );
}
