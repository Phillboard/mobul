import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactTable, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { supabase } from "@core/services/supabase";
import { useToast } from '@/shared/hooks';
import { useTenant } from "@/contexts/TenantContext";
import { Building2, Plus, Phone } from "lucide-react";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTablePagination } from "@/shared/components/ui/data-table-pagination";
import { DataTableToolbar } from "@/shared/components/ui/data-table-toolbar";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import { createAgencyCompaniesColumns } from "@/features/agency/components/agencyCompaniesColumns";
import { AgencyTwilioSettings } from "@/features/agency/components/AgencyTwilioSettings";
import { basicTableModels } from '@/shared/utils/table';

/**
 * AgencyManagement Component
 * 
 * This page allows agency owners to:
 * - View all companies/clients they manage
 * - Create new companies under their agency
 * - Monitor gift card pool assignments per company
 * 
 * Access: Only visible to users with 'agency_owner' role
 */
export default function AgencyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrg } = useTenant(); // Get current organization context
  
  // Tab state
  const [activeTab, setActiveTab] = useState("companies");
  
  // Dialog and form state management
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("");
  
  // Table state management
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  /**
   * Query: Fetch all companies/clients under this agency
   * 
   * This query:
   * - Filters by current organization ID
   * - Includes count of gift card pools per company
   * - Orders by creation date (newest first)
   * - Re-fetches when currentOrg changes
   */
  const { data: companies } = useQuery({
    queryKey: ['agency-companies', currentOrg?.id],
    enabled: !!currentOrg, // Only run query if organization is loaded
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*, gift_card_pools(count)')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  /**
   * Query: Fetch all gift card pools
   * 
   * Currently fetches all pools - may need filtering in future
   * to show only pools relevant to this agency
   */
  const { data: giftCardPools } = useQuery({
    queryKey: ['gift-card-pools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  /**
   * Mutation: Create a new company under the agency
   * 
   * Flow:
   * 1. Validates organization is selected
   * 2. Inserts new client record with agency's org_id
   * 3. On success: refreshes company list, shows toast, closes dialog
   * 4. On error: displays error message to user
   */
  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No organization selected");
      
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: newCompanyName,
          industry: newCompanyIndustry as any, // Cast to database enum type
          org_id: currentOrg.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh the companies list to show new company
      queryClient.invalidateQueries({ queryKey: ['agency-companies'] });
      
      // Show success notification
      toast({
        title: "Company created",
        description: "New company has been created successfully",
      });
      
      // Reset form and close dialog
      setIsCreateDialogOpen(false);
      setNewCompanyName("");
      setNewCompanyIndustry("");
    },
    onError: (error: any) => {
      // Show error notification with details
      toast({
        title: "Failed to create company",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  /**
   * Handler: Validate and submit company creation
   * 
   * Validates:
   * - Company name is not empty
   * - Industry is selected
   * 
   * Then triggers the mutation to create the company
   */
  const handleCreateCompany = () => {
    // Validate company name
    if (!newCompanyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }
    
    // Validate industry selection
    if (!newCompanyIndustry) {
      toast({
        title: "Industry required",
        description: "Please select an industry",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the form
    createCompanyMutation.mutate();
  };

  // Table columns configuration
  const columns = useMemo(() => createAgencyCompaniesColumns(), []);

  // TanStack Table instance
  const table = useReactTable({
    data: companies || [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    ...basicTableModels,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Agency Management</h1>
            <p className="text-muted-foreground">Manage companies, gift card assignments, and Twilio settings</p>
          </div>
          {activeTab === "companies" && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>
                    Create a new company under your agency
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Acme Corporation"
                    />
                  </div>
                  {/* Industry Selection - MUST match database enum values */}
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={newCompanyIndustry} onValueChange={setNewCompanyIndustry}>
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Core Service Industries */}
                        <SelectItem value="roofing">Roofing</SelectItem>
                        <SelectItem value="roofing_services">Roofing Services</SelectItem>
                        <SelectItem value="home_services">Home Services</SelectItem>
                        <SelectItem value="landscaping">Landscaping</SelectItem>
                        <SelectItem value="moving_company">Moving Company</SelectItem>
                        
                        {/* Automotive */}
                        <SelectItem value="auto_service">Auto Service</SelectItem>
                        <SelectItem value="auto_warranty">Auto Warranty</SelectItem>
                        <SelectItem value="auto_buyback">Auto Buyback</SelectItem>
                        
                        {/* Real Estate */}
                        <SelectItem value="rei">Real Estate Investment</SelectItem>
                        <SelectItem value="rei_postcard">REI Postcard</SelectItem>
                        <SelectItem value="realtor_listing">Realtor Listing</SelectItem>
                        
                        {/* Healthcare & Wellness */}
                        <SelectItem value="healthcare_checkup">Healthcare Checkup</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="veterinary">Veterinary</SelectItem>
                        <SelectItem value="fitness_gym">Fitness Gym</SelectItem>
                        
                        {/* Professional Services */}
                        <SelectItem value="legal_services">Legal Services</SelectItem>
                        <SelectItem value="financial_advisor">Financial Advisor</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        
                        {/* Retail & Food */}
                        <SelectItem value="retail_promo">Retail Promo</SelectItem>
                        <SelectItem value="restaurant_promo">Restaurant Promo</SelectItem>
                        
                        {/* Events */}
                        <SelectItem value="event_invite">Event Invite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleCreateCompany}
                    disabled={createCompanyMutation.isPending}
                    className="w-full"
                  >
                    {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="twilio" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Twilio Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            {/* Companies Table Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Companies
                </CardTitle>
                <CardDescription>Companies managed by your agency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataTableToolbar
                  table={table}
                  searchKey="name"
                  searchPlaceholder="Search companies..."
                >
                  <DataTableViewOptions table={table} />
                </DataTableToolbar>
                
                <DataTable table={table} />
                
                <DataTablePagination table={table} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="twilio" className="mt-6">
            <AgencyTwilioSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
