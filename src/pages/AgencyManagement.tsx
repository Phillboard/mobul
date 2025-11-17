import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { Building2, Plus, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AgencyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrg } = useTenant();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("");

  // Fetch companies under this agency
  const { data: companies } = useQuery({
    queryKey: ['agency-companies', currentOrg?.id],
    enabled: !!currentOrg,
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

  // Fetch gift card pools
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

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No organization selected");
      
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: newCompanyName,
          industry: newCompanyIndustry as any,
          org_id: currentOrg.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-companies'] });
      toast({
        title: "Company created",
        description: "New company has been created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewCompanyName("");
      setNewCompanyIndustry("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create company",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }
    if (!newCompanyIndustry) {
      toast({
        title: "Industry required",
        description: "Please select an industry",
        variant: "destructive",
      });
      return;
    }
    createCompanyMutation.mutate();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Agency Management</h1>
            <p className="text-muted-foreground">Manage companies and gift card assignments</p>
          </div>
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
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={newCompanyIndustry} onValueChange={setNewCompanyIndustry}>
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="financial_services">Financial Services</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="nonprofit">Nonprofit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Companies
            </CardTitle>
            <CardDescription>Companies managed by your agency</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Gift Card Pools</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies?.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.industry}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                        {company.gift_card_pools?.[0]?.count || 0}
                      </div>
                    </TableCell>
                    <TableCell>{company.credits?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {new Date(company.created_at || '').toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {(!companies || companies.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No companies yet. Create your first company to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
