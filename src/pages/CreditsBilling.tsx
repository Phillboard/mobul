import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Progress } from "@/shared/components/ui/progress";
import { 
  CreditCard, DollarSign, TrendingUp, AlertCircle, Plus, 
  RefreshCw, History, Settings, Zap, ArrowUpRight, ArrowDownRight,
  Loader2, CheckCircle, Clock, Building2
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@core/auth/AuthProvider";
import { supabase } from "@core/services/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

const RELOAD_THRESHOLD_OPTIONS = [50, 100, 250, 500, 1000];
const RELOAD_AMOUNT_OPTIONS = [100, 250, 500, 1000, 2500, 5000];

interface CreditAccount {
  id: string;
  entity_type: string;
  entity_id: string;
  balance: number;
  reserved_balance: number;
  total_purchased: number;
  total_used: number;
  total_remaining: number;
  currency: string;
  low_balance_threshold: number;
  auto_reload_enabled?: boolean;
  auto_reload_threshold?: number;
  auto_reload_amount?: number;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  credit_account_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
  created_by?: string;
}

export default function CreditsBilling() {
  const { currentClient, currentOrg, clients } = useTenant();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  const isAdmin = hasRole?.('admin') ?? false;
  const isAgencyOwner = hasRole?.('agency_owner') ?? false;
  const isCompanyOwner = hasRole?.('company_owner') ?? false;
  const isAdminOrAgency = isAdmin || isAgencyOwner;
  
  // State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [addCreditsOpen, setAddCreditsOpen] = useState(false);
  const [addCreditsAmount, setAddCreditsAmount] = useState("");
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(100);
  const [autoReloadAmount, setAutoReloadAmount] = useState(500);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Determine the target client
  const targetClientId = isAdminOrAgency ? (selectedClientId || currentClient?.id) : currentClient?.id;
  
  // Fetch credit account for target client
  const { data: creditAccount, isLoading: loadingAccount, refetch: refetchAccount, error: accountError } = useQuery({
    queryKey: ["credit-account", "client", targetClientId],
    queryFn: async () => {
      if (!targetClientId) return null;
      
      const { data, error } = await supabase
        .from("credit_accounts")
        .select("*")
        .eq("entity_type", "client")
        .eq("entity_id", targetClientId)
        .single();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching credit account:", error);
        throw error;
      }
      return data as CreditAccount | null;
    },
    enabled: !!targetClientId,
    retry: false,
  });

  // Fetch transaction history
  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ["credit-transactions", creditAccount?.id],
    queryFn: async () => {
      if (!creditAccount?.id) return [];
      
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("credit_account_id", creditAccount.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as CreditTransaction[];
    },
    enabled: !!creditAccount?.id,
  });

  // Fetch client details for display
  const { data: clientDetails } = useQuery({
    queryKey: ["client-details", targetClientId],
    queryFn: async () => {
      if (!targetClientId) return null;
      
      // First get client data
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, agency_id")
        .eq("id", targetClientId)
        .single();
      
      if (clientError) throw clientError;
      
      // Try to get agency name if user has permission (optional)
      let agencyName = null;
      if (clientData?.agency_id) {
        const { data: agencyData } = await supabase
          .from("agencies")
          .select("name")
          .eq("id", clientData.agency_id)
          .single();
        
        agencyName = agencyData?.name || null;
      }
      
      return {
        ...clientData,
        agencies: agencyName ? { name: agencyName } : null
      };
    },
    enabled: !!targetClientId,
  });

  // Initialize auto-reload settings from account data
  useEffect(() => {
    if (creditAccount) {
      setAutoReloadEnabled(creditAccount.auto_reload_enabled || false);
      setAutoReloadThreshold(creditAccount.auto_reload_threshold || 100);
      setAutoReloadAmount(creditAccount.auto_reload_amount || 500);
    }
  }, [creditAccount]);

  // Mutation to add credits
  const addCreditsMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!targetClientId) {
        throw new Error("No client selected");
      }
      
      // For admin/agency, add credits directly
      // The RPC function will automatically create a credit account if one doesn't exist
      if (isAdminOrAgency) {
        const { data, error } = await supabase.rpc("allocate_credits_atomic", {
          p_entity_type: "client",
          p_entity_id: targetClientId,
          p_amount: amount,
          p_description: "Manual credit addition by admin",
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
        });
        
        if (error) throw error;
        return data;
      } else {
        // Self-serve credit checkout is not available yet
        throw new Error("Self-service credit purchases are not available. Please contact support.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-account"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      setAddCreditsOpen(false);
      setAddCreditsAmount("");
      toast.success("Credits added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add credits");
    },
  });

  // Mutation to save auto-reload settings
  const saveAutoReloadMutation = useMutation({
    mutationFn: async () => {
      if (!targetClientId) {
        throw new Error("No client selected");
      }
      
      // If no account exists yet, create one first by allocating 0 credits
      let accountId = creditAccount?.id;
      if (!accountId) {
        const { data, error } = await supabase.rpc("allocate_credits_atomic", {
          p_entity_type: "client",
          p_entity_id: targetClientId,
          p_amount: 0,
          p_description: "Auto-reload settings initialization",
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
        });
        
        if (error) throw error;
        
        // Get the newly created account ID
        const { data: newAccount } = await supabase
          .from("credit_accounts")
          .select("id")
          .eq("entity_type", "client")
          .eq("entity_id", targetClientId)
          .single();
        
        if (!newAccount) throw new Error("Failed to create credit account");
        accountId = newAccount.id;
      }
      
      const { error } = await supabase
        .from("credit_accounts")
        .update({
          auto_reload_enabled: autoReloadEnabled,
          auto_reload_threshold: autoReloadThreshold,
          auto_reload_amount: autoReloadAmount,
        })
        .eq("id", accountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-account"] });
      toast.success("Auto-reload settings saved");
      setSavingSettings(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings");
      setSavingSettings(false);
    },
  });

  const handleSaveAutoReload = () => {
    setSavingSettings(true);
    saveAutoReloadMutation.mutate();
  };

  const handleAddCredits = () => {
    const amount = parseFloat(addCreditsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    addCreditsMutation.mutate(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
      case "allocation_in":
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case "redemption":
      case "allocation_out":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "refund":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Purchase</Badge>;
      case "allocation_in":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Credit Added</Badge>;
      case "allocation_out":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Allocated</Badge>;
      case "redemption":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Redemption</Badge>;
      case "refund":
        return <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20">Refund</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const creditUsagePercent = creditAccount 
    ? Math.min(100, (creditAccount.total_used / Math.max(creditAccount.total_purchased, 1)) * 100)
    : 0;

  const lowBalance = creditAccount && creditAccount.total_remaining < 100;

  // Error handling
  if (accountError) {
    return (
      <Layout>
        <div className="container mx-auto py-8 max-w-6xl">
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
                    Error Loading Credit Account
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {accountError instanceof Error ? accountError.message : 'An unexpected error occurred'}
                  </p>
                </div>
                <Button onClick={() => refetchAccount()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!currentClient && !isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please select a client</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Credits & Billing</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account credits and billing settings
            </p>
          </div>
          
          {/* Client Selector for Admin/Agency */}
          {isAdminOrAgency && clients && clients.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={selectedClientId || currentClient?.id || ""} 
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Minimum Credit Warning */}
        {lowBalance && (
          <Card className="mb-6 border-orange-500/50 bg-orange-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-700 dark:text-orange-400">
                    Low Credit Balance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your balance is below $100. You need at least $100 in credits to activate campaigns.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="ml-auto border-orange-500 text-orange-600 hover:bg-orange-500/10"
                  onClick={() => setAddCreditsOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credits
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credit Balance Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Main Balance Card */}
          <Card className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5" />
                Credit Balance
              </CardTitle>
              <CardDescription className="text-slate-300">
                {clientDetails?.name || "Your account"}
                {clientDetails?.agencies?.name && (
                  <span className="text-slate-400"> • {clientDetails.agencies.name}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAccount ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </div>
              ) : creditAccount ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Available</div>
                      <div className="text-3xl font-bold text-emerald-400">
                        ${creditAccount.total_remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Total Purchased</div>
                      <div className="text-2xl font-semibold">
                        ${creditAccount.total_purchased.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Total Used</div>
                      <div className="text-2xl font-semibold">
                        ${creditAccount.total_used.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Credit Usage</span>
                      <span>{creditUsagePercent.toFixed(1)}%</span>
                    </div>
                    <Progress value={creditUsagePercent} className="h-2 bg-slate-700" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">No credit account yet</p>
                  <Button onClick={() => setAddCreditsOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credits to Get Started
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog open={addCreditsOpen} onOpenChange={setAddCreditsOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credits
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Credits</DialogTitle>
                    <DialogDescription>
                      {isAdminOrAgency 
                        ? "Add credits to this client's account."
                        : "Purchase credits via Stripe. You'll be redirected to checkout."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        value={addCreditsAmount}
                        onChange={(e) => setAddCreditsAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[100, 250, 500, 1000, 2500].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setAddCreditsAmount(amount.toString())}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddCreditsOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddCredits}
                      disabled={addCreditsMutation.isPending}
                    >
                      {addCreditsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-2" />
                          {isAdminOrAgency ? "Add Credits" : "Checkout"}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => refetchAccount()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Balance
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Settings and History */}
        <Tabs defaultValue="auto-reload" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="auto-reload" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Auto-Reload
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Transaction History
            </TabsTrigger>
          </TabsList>

          {/* Auto-Reload Settings */}
          <TabsContent value="auto-reload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Auto-Reload Settings
                </CardTitle>
                <CardDescription>
                  Automatically add credits when your balance drops below a threshold.
                  Your saved payment method will be charged.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Auto-Reload</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically recharge when balance is low
                    </p>
                  </div>
                  <Switch
                    checked={autoReloadEnabled}
                    onCheckedChange={setAutoReloadEnabled}
                  />
                </div>

                {autoReloadEnabled && (
                  <>
                    <Separator />
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Threshold */}
                      <div className="space-y-2">
                        <Label>Reload when balance drops below</Label>
                        <Select 
                          value={autoReloadThreshold.toString()} 
                          onValueChange={(val) => setAutoReloadThreshold(parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RELOAD_THRESHOLD_OPTIONS.map((threshold) => (
                              <SelectItem key={threshold} value={threshold.toString()}>
                                ${threshold}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          We'll charge your card when your balance falls below this amount
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="space-y-2">
                        <Label>Amount to reload</Label>
                        <Select 
                          value={autoReloadAmount.toString()} 
                          onValueChange={(val) => setAutoReloadAmount(parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RELOAD_AMOUNT_OPTIONS.map((amount) => (
                              <SelectItem key={amount} value={amount.toString()}>
                                ${amount}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          This amount will be added to your balance
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Auto-Reload Summary</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        When your balance drops below <strong>${autoReloadThreshold}</strong>, 
                        we'll automatically add <strong>${autoReloadAmount}</strong> to your account.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveAutoReload}
                    disabled={savingSettings || saveAutoReloadMutation.isPending}
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  View all credit transactions for this account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(txn.created_at), "MMM d, yyyy h:mm a")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(txn.transaction_type)}
                              {getTransactionBadge(txn.transaction_type)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {txn.description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={txn.amount >= 0 ? "text-green-600" : "text-red-600"}>
                              {txn.amount >= 0 ? "+" : ""}${txn.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${txn.balance_after.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No transactions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Transactions will appear here when credits are added or used
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

