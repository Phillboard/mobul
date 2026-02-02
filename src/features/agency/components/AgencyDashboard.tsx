import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from '@shared/hooks';
import { DollarSign, Users, TrendingUp, Plus, ArrowDown, AlertCircle } from "lucide-react";
import type { CreditAccount, ClientUsageSummary } from "@/types/creditAccounts";

export function AgencyDashboard() {
  const { toast } = useToast();
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [allocationNotes, setAllocationNotes] = useState("");
  const [allocating, setAllocating] = useState(false);

  // Get current user's agency
  const { data: userAgency } = useQuery({
    queryKey: ["user-agency"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_agencies")
        .select(`
          agency_id,
          agencies (
            id,
            name,
            credit_account_id,
            enabled_brands,
            default_markup_percentage
          )
        `)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data.agencies;
    }
  });

  // Fetch agency credit account
  const { data: creditAccount, refetch: refetchCredit } = useQuery({
    queryKey: ["agency-credit", userAgency?.credit_account_id],
    queryFn: async () => {
      if (!userAgency?.credit_account_id) return null;

      const { data, error } = await supabase
        .from("credit_accounts")
        .select("*")
        .eq("id", userAgency.credit_account_id)
        .single();

      if (error) throw error;
      return data as CreditAccount;
    },
    enabled: !!userAgency?.credit_account_id
  });

  // Fetch clients
  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ["agency-clients", userAgency?.id],
    queryFn: async () => {
      if (!userAgency?.id) return [];

      const { data: clientsData, error } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          credit_account_id,
          created_at,
          credit_accounts (
            total_purchased,
            total_used,
            total_remaining,
            status
          )
        `)
        .eq("agency_id", userAgency.id);

      if (error) throw error;

      // Get campaign counts and monthly stats for each client
      const clientsWithStats = await Promise.all(
        clientsData.map(async (client) => {
          const { count: campaignsCount } = await supabase
            .from("campaigns")
            .select("*", { count: "only", head: true })
            .eq("client_id", client.id);

          const { count: activeCampaignsCount } = await supabase
            .from("campaigns")
            .select("*", { count: "only", head: true })
            .eq("client_id", client.id)
            .eq("status", "active");

          // Get redemptions this month
          const firstDayOfMonth = new Date();
          firstDayOfMonth.setDate(1);
          firstDayOfMonth.setHours(0, 0, 0, 0);

          const { count: cardsThisMonth } = await supabase
            .from("gift_card_redemptions")
            .select("*", { count: "only", head: true })
            .gte("created_at", firstDayOfMonth.toISOString())
            .in("campaign_id",
              supabase.from("campaigns").select("id").eq("client_id", client.id)
            );

          const { data: spentData } = await supabase
            .from("gift_card_redemptions")
            .select("amount_charged")
            .gte("created_at", firstDayOfMonth.toISOString())
            .in("campaign_id",
              supabase.from("campaigns").select("id").eq("client_id", client.id)
            );

          const spentThisMonth = spentData?.reduce((sum, r) => sum + (r.amount_charged || 0), 0) || 0;

          const creditBalance = client.credit_accounts?.total_remaining || 0;
          const lowCredit = creditBalance < 500;

          return {
            clientId: client.id,
            clientName: client.name,
            creditBalance: creditBalance,
            campaignsCount: campaignsCount || 0,
            activeCampaignsCount: activeCampaignsCount || 0,
            cardsRedeemedThisMonth: cardsThisMonth || 0,
            spentThisMonth: spentThisMonth,
            lowCredit: lowCredit
          } as ClientUsageSummary;
        })
      );

      return clientsWithStats;
    },
    enabled: !!userAgency?.id
  });

  // Handle credit allocation
  const handleAllocate = async () => {
    if (!selectedClient || !allocationAmount || !creditAccount) {
      toast({
        title: "Missing Information",
        description: "Please select a client and enter an amount",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(allocationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive amount",
        variant: "destructive"
      });
      return;
    }

    if (amount > creditAccount.total_remaining) {
      toast({
        title: "Insufficient Credit",
        description: `You only have $${creditAccount.total_remaining} available`,
        variant: "destructive"
      });
      return;
    }

    setAllocating(true);
    try {
      const client = clients?.find(c => c.clientId === selectedClient);
      if (!client) throw new Error("Client not found");

      // Find client's credit account
      const { data: clientData } = await supabase
        .from("clients")
        .select("credit_account_id")
        .eq("id", selectedClient)
        .single();

      if (!clientData?.credit_account_id) {
        throw new Error("Client credit account not found");
      }

      // Call allocate-credit function
      await callEdgeFunction(
        Endpoints.admin.allocateCredit,
        {
          fromAccountId: creditAccount.id,
          toAccountId: clientData.credit_account_id,
          amount: amount,
          notes: allocationNotes || `Credit allocation to ${client.clientName}`
        }
      );

      toast({
        title: "Credit Allocated Successfully!",
        description: `$${amount.toLocaleString()} allocated to ${client.clientName}`
      });

      // Refresh data
      refetchCredit();
      refetchClients();

      // Close dialog and reset form
      setAllocateDialogOpen(false);
      setSelectedClient("");
      setAllocationAmount("");
      setAllocationNotes("");

    } catch (error: any) {
      toast({
        title: "Allocation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAllocating(false);
    }
  };

  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter(c => c.activeCampaignsCount > 0).length || 0;
  const cardsThisMonth = clients?.reduce((sum, c) => sum + c.cardsRedeemedThisMonth, 0) || 0;
  const revenueThisMonth = clients?.reduce((sum, c) => sum + c.spentThisMonth, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agency Dashboard</h1>
          <p className="text-muted-foreground">
            {userAgency?.name || "Loading..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Purchase Credit
          </Button>
        </div>
      </div>

      {/* Credit Balance Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <CardHeader>
          <CardTitle className="text-white">My Credit Balance</CardTitle>
          <CardDescription className="text-blue-100">
            Available credit for allocation to clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm opacity-90">Purchased</div>
              <div className="text-3xl font-bold">
                ${creditAccount?.total_purchased.toLocaleString() || 0}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Allocated</div>
              <div className="text-3xl font-bold">
                ${creditAccount?.total_allocated.toLocaleString() || 0}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Available</div>
              <div className="text-3xl font-bold">
                ${creditAccount?.total_remaining.toLocaleString() || 0}
              </div>
            </div>
          </div>

          {creditAccount && creditAccount.total_remaining < 1000 && (
            <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Low credit warning - Consider purchasing more credit</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">{activeClients} with active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardsThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${revenueThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From redemptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Credit Clients</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients?.filter(c => c.lowCredit).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Clients</CardTitle>
              <CardDescription>Manage client credit and view usage statistics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Allocate Credit to Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Allocate Credit to Client</DialogTitle>
                    <DialogDescription>
                      Transfer credit from your agency account to a client
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Client</Label>
                      <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.clientId} value={client.clientId}>
                              {client.clientName} (${client.creditBalance.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={allocationAmount}
                        onChange={(e) => setAllocationAmount(e.target.value)}
                        placeholder="Enter amount"
                      />
                      <p className="text-sm text-muted-foreground">
                        Available: ${creditAccount?.total_remaining.toLocaleString() || 0}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={allocationNotes}
                        onChange={(e) => setAllocationNotes(e.target.value)}
                        placeholder="Add notes about this allocation"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setAllocateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAllocate}
                      disabled={!selectedClient || !allocationAmount || allocating}
                    >
                      {allocating ? "Allocating..." : "Allocate Credit"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Credit Balance</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Cards This Month</TableHead>
                <TableHead>Spent This Month</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients?.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell className="font-medium">{client.clientName}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                      {client.creditBalance.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.activeCampaignsCount} / {client.campaignsCount}
                  </TableCell>
                  <TableCell>{client.cardsRedeemedThisMonth.toLocaleString()}</TableCell>
                  <TableCell>${client.spentThisMonth.toLocaleString()}</TableCell>
                  <TableCell>
                    {client.lowCredit ? (
                      <Badge variant="destructive">Low Credit</Badge>
                    ) : (
                      <Badge variant="secondary">Healthy</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

