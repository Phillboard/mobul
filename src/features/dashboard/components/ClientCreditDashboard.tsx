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
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from '@shared/hooks';
import { DollarSign, TrendingUp, AlertCircle, Plus, ArrowDown } from "lucide-react";
import type { CreditAccount, CampaignBudgetStatus } from "@/types/creditAccounts";

export function ClientCreditDashboard() {
  const { toast } = useToast();
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [useSharedCredit, setUseSharedCredit] = useState(true);
  const [allocating, setAllocating] = useState(false);

  // Get current user's client
  const { data: userClient } = useQuery({
    queryKey: ["user-client"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find client associated with this user
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          credit_account_id,
          agency_id,
          agencies (name)
        `)
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch client credit account
  const { data: creditAccount, refetch: refetchCredit } = useQuery({
    queryKey: ["client-credit", userClient?.credit_account_id],
    queryFn: async () => {
      if (!userClient?.credit_account_id) return null;

      const { data, error } = await supabase
        .from("credit_accounts")
        .select("*")
        .eq("id", userClient.credit_account_id)
        .single();

      if (error) throw error;
      return data as CreditAccount;
    },
    enabled: !!userClient?.credit_account_id
  });

  // Fetch campaigns
  const { data: campaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ["client-campaigns", userClient?.id],
    queryFn: async () => {
      if (!userClient?.id) return [];

      const { data: campaignsData, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          status,
          uses_shared_credit,
          allocated_budget,
          credit_account_id,
          created_at
        `)
        .eq("client_id", userClient.id);

      if (error) throw error;

      // Get redemption stats for each campaign
      const campaignsWithStats = await Promise.all(
        campaignsData.map(async (campaign) => {
          const { count: redemptionsCount } = await supabase
            .from("gift_card_redemptions")
            .select("*", { count: "only", head: true })
            .eq("campaign_id", campaign.id);

          const { data: redemptionsData } = await supabase
            .from("gift_card_redemptions")
            .select("amount_charged")
            .eq("campaign_id", campaign.id);

          const budgetUsed = redemptionsData?.reduce((sum, r) => sum + (r.amount_charged || 0), 0) || 0;

          let budgetRemaining = 0;
          let status: "healthy" | "low" | "depleted" = "healthy";

          if (campaign.uses_shared_credit) {
            budgetRemaining = creditAccount?.total_remaining || 0;
            status = budgetRemaining < 100 ? "low" : "healthy";
          } else if (campaign.credit_account_id) {
            const { data: campaignAccount } = await supabase
              .from("credit_accounts")
              .select("total_remaining")
              .eq("id", campaign.credit_account_id)
              .single();

            budgetRemaining = campaignAccount?.total_remaining || 0;
            
            if (budgetRemaining === 0) status = "depleted";
            else if (budgetRemaining < 100) status = "low";
            else status = "healthy";
          }

          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            usesSharedCredit: campaign.uses_shared_credit,
            allocatedBudget: campaign.allocated_budget,
            budgetUsed: budgetUsed,
            budgetRemaining: budgetRemaining,
            sharedCreditAvailable: campaign.uses_shared_credit ? creditAccount?.total_remaining : undefined,
            redemptionsCount: redemptionsCount || 0,
            estimatedRedemptionsRemaining: budgetRemaining > 0 ? Math.floor(budgetRemaining / 25) : 0,
            status: status
          } as CampaignBudgetStatus;
        })
      );

      return campaignsWithStats;
    },
    enabled: !!userClient?.id && !!creditAccount
  });

  // Handle budget allocation
  const handleAllocateBudget = async () => {
    if (!selectedCampaign || (!useSharedCredit && !budgetAmount)) {
      toast({
        title: "Missing Information",
        description: "Please select a campaign and configure budget",
        variant: "destructive"
      });
      return;
    }

    setAllocating(true);
    try {
      if (useSharedCredit) {
        // Just toggle the campaign to use shared credit
        const { error } = await supabase
          .from("campaigns")
          .update({ uses_shared_credit: true })
          .eq("id", selectedCampaign);

        if (error) throw error;

        toast({
          title: "Budget Updated",
          description: "Campaign now uses shared client credit"
        });
      } else {
        // Allocate isolated budget
        const amount = parseFloat(budgetAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid budget amount");
        }

        if (!creditAccount || amount > creditAccount.total_remaining) {
          throw new Error("Insufficient credit");
        }

        // Get campaign's credit account
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("credit_account_id")
          .eq("id", selectedCampaign)
          .single();

        if (!campaign?.credit_account_id) {
          throw new Error("Campaign credit account not found");
        }

        // Allocate credit
        await callEdgeFunction(
          Endpoints.admin.allocateCredit,
          {
            fromAccountId: creditAccount.id,
            toAccountId: campaign.credit_account_id,
            amount: amount,
            notes: "Budget allocation to campaign"
          }
        );

        // Update campaign settings
        await supabase
          .from("campaigns")
          .update({
            uses_shared_credit: false,
            allocated_budget: amount
          })
          .eq("id", selectedCampaign);

        toast({
          title: "Budget Allocated",
          description: `$${amount.toLocaleString()} allocated to campaign`
        });
      }

      // Refresh data
      refetchCredit();
      refetchCampaigns();

      // Close dialog
      setBudgetDialogOpen(false);
      setSelectedCampaign("");
      setBudgetAmount("");
      setUseSharedCredit(true);

    } catch (error: any) {
      toast({
        title: "Budget Allocation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAllocating(false);
    }
  };

  const activeCampaigns = campaigns?.filter(c => c.status !== "depleted").length || 0;
  const cardsThisMonth = campaigns?.reduce((sum, c) => sum + c.redemptionsCount, 0) || 0;
  const spentThisMonth = campaigns?.reduce((sum, c) => sum + c.budgetUsed, 0) || 0;
  const lowBudgetCampaigns = campaigns?.filter(c => c.status === "low").length || 0;

  const getStatusBadge = (status: "healthy" | "low" | "depleted") => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500">Healthy</Badge>;
      case "low":
        return <Badge className="bg-yellow-500">Low Budget</Badge>;
      case "depleted":
        return <Badge variant="destructive">Depleted</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit & Budget Management</h1>
          <p className="text-muted-foreground">
            {userClient?.name || "Loading..."} • Agency: {userClient?.agencies?.name || "N/A"}
          </p>
        </div>
        <Button variant="outline">
          <DollarSign className="h-4 w-4 mr-2" />
          Purchase More Credit
        </Button>
      </div>

      {/* Credit Balance Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="text-white">My Credit Balance</CardTitle>
          <CardDescription className="text-purple-100">
            Available for campaign budgets and redemptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm opacity-90">Total</div>
              <div className="text-3xl font-bold">
                ${creditAccount?.total_purchased.toLocaleString() || 0}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Used</div>
              <div className="text-3xl font-bold">
                ${creditAccount?.total_used.toLocaleString() || 0}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90">Remaining</div>
              <div className="text-3xl font-bold">
                ${creditAccount?.total_remaining.toLocaleString() || 0}
              </div>
            </div>
          </div>

          {creditAccount && creditAccount.total_remaining < 500 && (
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
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">With available budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Redeemed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cardsThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${spentThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">On redemptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Budget</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowBudgetCampaigns}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Campaigns</CardTitle>
              <CardDescription>Manage campaign budgets and view redemption statistics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Allocate Budget
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Allocate Campaign Budget</DialogTitle>
                    <DialogDescription>
                      Configure how this campaign uses credit
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Campaign</Label>
                      <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns?.map((campaign) => (
                            <SelectItem key={campaign.campaignId} value={campaign.campaignId}>
                              {campaign.campaignName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Use Shared Credit</Label>
                        <p className="text-sm text-muted-foreground">
                          Campaign draws from your client credit balance
                        </p>
                      </div>
                      <Switch
                        checked={useSharedCredit}
                        onCheckedChange={setUseSharedCredit}
                      />
                    </div>

                    {!useSharedCredit && (
                      <div className="space-y-2">
                        <Label>Isolated Budget Amount ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          placeholder="Enter budget amount"
                        />
                        <p className="text-sm text-muted-foreground">
                          Available: ${creditAccount?.total_remaining.toLocaleString() || 0}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setBudgetDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAllocateBudget}
                      disabled={!selectedCampaign || allocating}
                    >
                      {allocating ? "Updating..." : "Update Budget"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Budget Type</TableHead>
                <TableHead>Budget Used</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Redemptions</TableHead>
                <TableHead>Est. Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.map((campaign) => (
                <TableRow key={campaign.campaignId}>
                  <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                  <TableCell>
                    {campaign.usesSharedCredit ? (
                      <Badge variant="secondary">Shared</Badge>
                    ) : (
                      <Badge variant="outline">
                        ${campaign.allocatedBudget?.toLocaleString() || 0}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>${campaign.budgetUsed.toLocaleString()}</TableCell>
                  <TableCell>
                    {campaign.usesSharedCredit ? (
                      <span className="text-muted-foreground">
                        ${campaign.sharedCreditAvailable?.toLocaleString() || 0} (shared)
                      </span>
                    ) : (
                      <span>${campaign.budgetRemaining.toLocaleString()}</span>
                    )}
                  </TableCell>
                  <TableCell>{campaign.redemptionsCount}</TableCell>
                  <TableCell>~{campaign.estimatedRedemptionsRemaining} cards</TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

