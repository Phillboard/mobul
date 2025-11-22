import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useCompanies } from "@/hooks/useCompanies";
import { CompaniesTable } from "@/components/contacts/CompaniesTable";

export default function Companies() {
  const { currentClient } = useTenant();
  const [search, setSearch] = useState("");

  const { data: companies, isLoading } = useCompanies(currentClient?.id || null, { search });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Companies</h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Manage your company accounts and organizations
            </p>
          </div>
          <Button className="shrink-0 h-12 md:h-10 hidden sm:flex">
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Companies</p>
                  <p className="text-xl sm:text-2xl font-bold">{companies?.length || 0}</p>
                </div>
                <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card variant="glass">
          <CardContent className="p-4 md:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Company List */}
        <CompaniesTable companies={companies || []} isLoading={isLoading} />
        
        {/* Floating Action Button for Mobile */}
        <Button 
          size="icon"
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl sm:hidden z-40 hover:scale-110 active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </Layout>
  );
}
