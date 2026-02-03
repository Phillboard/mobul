/**
 * Agency Gift Cards Page
 * 
 * Agency-level gift card management dashboard.
 * Allows agency owners to:
 * - View available brands (those enabled by admin for their agency)
 * - Assign brands to clients
 * - Configure client markup/pricing
 * - View activity
 */

import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Activity, 
  Users, 
  DollarSign, 
  Package,
  Gift,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useAuth } from "@core/auth/AuthProvider";
import { formatCurrency } from "@/shared/utils/currencyUtils";
import { AgencyClientAccessTab } from "@/features/gift-cards/components/AgencyClientAccessTab";
import { AgencyPricingTab } from "@/features/gift-cards/components/AgencyPricingTab";

export default function AgencyGiftCards() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Get agency ID for current user
  const { data: userAgency, isLoading: isLoadingAgency } = useQuery({
    queryKey: ["user-agency", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get user's agency from user_agencies table
      const { data, error } = await supabase
        .from("user_agencies")
        .select(`
          agency_id,
          role,
          agencies (id, name, gift_card_markup_percentage)
        `)
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user agency:", error);
        return null;
      }
      
      return {
        agencyId: data.agency_id,
        role: data.role,
        agency: data.agencies as any,
      };
    },
    enabled: !!user?.id,
  });

  const agencyId = userAgency?.agencyId;
  const agencyName = userAgency?.agency?.name;

  // Fetch overview stats
  const { data: overviewStats } = useQuery({
    queryKey: ["agency-gift-card-overview", agencyId],
    queryFn: async () => {
      if (!agencyId) return null;

      // Get enabled brands count
      const { data: brandsData, error: brandsError } = await supabase
        .from("agency_available_gift_cards")
        .select("brand_id")
        .eq("agency_id", agencyId)
        .eq("is_enabled", true);

      const uniqueBrands = new Set(brandsData?.map(b => b.brand_id));
      
      // Get clients count
      const { data: clientsData, error: clientsError } = await supabase
        .from("agency_client_assignments")
        .select("client_id")
        .eq("agency_org_id", agencyId);

      // Get billing data for this agency
      const { data: billingData, error: billingError } = await supabase
        .from("gift_card_billing_ledger")
        .select("amount_billed, cost_basis")
        .eq("billed_entity_type", "agency")
        .eq("billed_entity_id", agencyId);

      let totalRevenue = 0;
      let totalCost = 0;
      let cardsProvisioned = 0;

      billingData?.forEach((item) => {
        totalRevenue += Number(item.amount_billed) || 0;
        totalCost += Number(item.cost_basis) || 0;
        cardsProvisioned++;
      });

      return {
        enabledBrands: uniqueBrands.size,
        clientCount: clientsData?.length || 0,
        totalRevenue,
        totalCost,
        profit: totalRevenue - totalCost,
        cardsProvisioned,
        markup: userAgency?.agency?.gift_card_markup_percentage || 0,
      };
    },
    enabled: !!agencyId,
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["agency-gift-card-activity", agencyId],
    queryFn: async () => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from("gift_card_billing_ledger")
        .select(`
          id,
          amount_billed,
          denomination,
          billed_at,
          gift_card_brands (brand_name, logo_url),
          clients:billed_entity_id (name)
        `)
        .eq("billed_entity_type", "agency")
        .eq("billed_entity_id", agencyId)
        .order("billed_at", { ascending: false })
        .limit(10);

      if (error) return [];
      return data;
    },
    enabled: !!agencyId,
  });

  if (isLoadingAgency) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!agencyId) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-lg font-semibold mb-2">No Agency Access</h2>
              <p className="text-muted-foreground">
                You don't have access to any agency. Contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gift Card Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage gift card brands and pricing for your clients
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="h-4 w-4 mr-2" />
              Client Access
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Enabled Brands
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewStats?.enabledBrands || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for your clients
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Clients
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewStats?.clientCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Under your agency
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cards Provisioned
                  </CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewStats?.cardsProvisioned || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total cards sent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Your Markup
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {overviewStats?.markup || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    On client purchases
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(overviewStats?.totalRevenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {formatCurrency(overviewStats?.totalCost || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(overviewStats?.profit || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity: any) => {
                      const brand = activity.gift_card_brands;
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            {brand?.logo_url && (
                              <img
                                src={brand.logo_url}
                                alt={brand.brand_name}
                                className="h-8 w-8 object-contain"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                ${activity.denomination} {brand?.brand_name || "Card"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.billed_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {formatCurrency(activity.amount_billed)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Access Tab */}
          <TabsContent value="clients">
            <AgencyClientAccessTab agencyId={agencyId} agencyName={agencyName} />
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <AgencyPricingTab agencyId={agencyId} agencyName={agencyName} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
