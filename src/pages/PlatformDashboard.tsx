import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImpersonateUserDialog } from "@/components/admin/ImpersonateUserDialog";
import {
  Building2,
  Briefcase,
  Users,
  Send,
  TrendingUp,
  Gift,
  Phone,
  Shield,
  Activity,
  UserCircle2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function PlatformDashboard() {
  const { data: platformStats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [orgsRes, clientsRes, usersRes, campaignsRes, callsRes, giftsRes] = await Promise.all([
        supabase.from('organizations').select('id, name, type, created_at'),
        supabase.from('clients').select('id, name, industry, org_id, created_at'),
        supabase.from('profiles').select('id, full_name, email, created_at'),
        supabase.from('campaigns').select('id, name, status, created_at'),
        supabase.from('call_sessions').select('id, created_at'),
        supabase.from('gift_card_deliveries').select('id, created_at'),
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (campaignsRes.error) throw campaignsRes.error;
      if (callsRes.error) throw callsRes.error;
      if (giftsRes.error) throw giftsRes.error;

      // Calculate clients by industry
      const clientsByIndustry = (clientsRes.data || []).reduce((acc, client) => {
        acc[client.industry] = (acc[client.industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const industryData = Object.entries(clientsByIndustry).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }));

      // Calculate campaigns by status
      const campaignsByStatus = (campaignsRes.data || []).reduce((acc, campaign) => {
        acc[campaign.status || 'draft'] = (acc[campaign.status || 'draft'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrgs: orgsRes.data?.length || 0,
        totalClients: clientsRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
        totalCampaigns: campaignsRes.data?.length || 0,
        activeCampaigns: campaignsRes.data?.filter(c => c.status === 'mailed' || c.status === 'in_production').length || 0,
        totalCalls: callsRes.data?.length || 0,
        totalGiftCards: giftsRes.data?.length || 0,
        industryData,
        campaignsByStatus,
        organizations: orgsRes.data || [],
        recentClients: (clientsRes.data || []).slice(-5).reverse(),
      };
    },
  });

  const kpiCards = [
    {
      title: "Organizations",
      value: platformStats?.totalOrgs || 0,
      icon: Building2,
      color: "text-blue-600",
      bgGradient: "from-blue-600/10 via-blue-600/5 to-transparent",
    },
    {
      title: "Total Clients",
      value: platformStats?.totalClients || 0,
      icon: Briefcase,
      color: "text-purple-600",
      bgGradient: "from-purple-600/10 via-purple-600/5 to-transparent",
    },
    {
      title: "Platform Users",
      value: platformStats?.totalUsers || 0,
      icon: Users,
      color: "text-green-600",
      bgGradient: "from-green-600/10 via-green-600/5 to-transparent",
    },
    {
      title: "Total Campaigns",
      value: platformStats?.totalCampaigns || 0,
      icon: Send,
      color: "text-primary",
      bgGradient: "from-primary/10 via-primary/5 to-transparent",
    },
    {
      title: "Active Campaigns",
      value: platformStats?.activeCampaigns || 0,
      icon: Activity,
      color: "text-amber-600",
      bgGradient: "from-amber-600/10 via-amber-600/5 to-transparent",
    },
    {
      title: "Total Calls",
      value: platformStats?.totalCalls || 0,
      icon: Phone,
      color: "text-cyan-600",
      bgGradient: "from-cyan-600/10 via-cyan-600/5 to-transparent",
    },
    {
      title: "Gift Cards Sent",
      value: platformStats?.totalGiftCards || 0,
      icon: Gift,
      color: "text-pink-600",
      bgGradient: "from-pink-600/10 via-pink-600/5 to-transparent",
    },
  ];

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-amber-500" />
          <h1 className="text-3xl font-bold">Platform Dashboard</h1>
          <Badge variant="secondary" className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20">
            Admin View
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500" />
          <h1 className="text-3xl font-bold">Platform Dashboard</h1>
          <Badge variant="secondary" className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20">
            Admin View
          </Badge>
        </div>
        <ImpersonateUserDialog 
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <UserCircle2 className="h-4 w-4" />
              Impersonate User
            </Button>
          }
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clients by Industry</CardTitle>
            <CardDescription>Distribution across all verticals</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={platformStats?.industryData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(platformStats?.industryData || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Status</CardTitle>
            <CardDescription>Current campaign distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(platformStats?.campaignsByStatus || {}).map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>All organizations in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {platformStats?.organizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{org.type}</p>
                  </div>
                </div>
                <Badge variant="outline">
                  {platformStats.recentClients.filter(c => c.org_id === org.id).length} clients
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clients</CardTitle>
          <CardDescription>Latest clients added to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {platformStats?.recentClients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{client.industry.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <Badge variant="outline">{client.industry.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
