import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Mail, Users, Gift, TrendingUp, Phone, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays } from "date-fns";

export default function Analytics() {
  // Fetch campaigns summary
  const { data: campaignStats } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('status, created_at');
      
      if (error) throw error;
      
      const mailed = data?.filter(c => c.status === 'mailed').length || 0;
      const completed = data?.filter(c => c.status === 'completed').length || 0;
      const draft = data?.filter(c => c.status === 'draft').length || 0;
      
      return { mailed, completed, draft, total: data?.length || 0 };
    },
  });

  // Fetch recipients summary
  const { data: recipientStats } = useQuery({
    queryKey: ['recipient-stats'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('recipients')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch gift card stats
  const { data: giftCardStats } = useQuery({
    queryKey: ['gift-card-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('status, current_balance');
      
      if (error) throw error;
      
      const delivered = data?.filter(c => c.status === 'delivered').length || 0;
      const redeemed = data?.filter(c => c.status === 'redeemed').length || 0;
      const totalValue = data?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0;
      
      return { delivered, redeemed, totalValue };
    },
  });

  // Fetch call center stats
  const { data: callStats } = useQuery({
    queryKey: ['call-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_sessions')
        .select('call_status, call_duration_seconds');
      
      if (error) throw error;
      
      const completed = data?.filter(c => c.call_status === 'completed').length || 0;
      const inProgress = data?.filter(c => c.call_status === 'in-progress').length || 0;
      const avgDuration = data?.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) / (data?.length || 1);
      
      return { completed, inProgress, avgDuration: Math.round(avgDuration / 60) };
    },
  });

  // Fetch recent activity (last 30 days)
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from('events')
        .select('event_type, occurred_at')
        .gte('occurred_at', thirtyDaysAgo.toISOString())
        .order('occurred_at', { ascending: true });
      
      if (error) throw error;
      
      // Group by day
      const eventsByDay = new Map<string, any>();
      
      data?.forEach(event => {
        const day = format(new Date(event.occurred_at!), 'MM/dd');
        if (!eventsByDay.has(day)) {
          eventsByDay.set(day, {
            day,
            qr_scans: 0,
            form_submissions: 0,
            purl_views: 0,
          });
        }
        
        const dayData = eventsByDay.get(day);
        if (event.event_type === 'qr_scanned') dayData.qr_scans++;
        if (event.event_type === 'form_submitted') dayData.form_submissions++;
        if (event.event_type === 'purl_viewed') dayData.purl_views++;
      });
      
      return Array.from(eventsByDay.values());
    },
  });

  // Fetch top performing campaigns
  const { data: topCampaigns } = useQuery({
    queryKey: ['top-campaigns'],
    queryFn: async () => {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name')
        .limit(10);
      
      if (campaignsError) throw campaignsError;
      
      const campaignWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
          const { count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('event_type', ['qr_scanned', 'form_submitted']);
          
          return {
            name: campaign.name,
            engagement: count || 0,
          };
        })
      );
      
      return campaignWithStats.sort((a, b) => b.engagement - a.engagement).slice(0, 5);
    },
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analytics Overview
          </h1>
          <p className="text-muted-foreground mt-2">
            Platform-wide performance metrics and insights
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mailed Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignStats?.mailed || 0}</div>
              <p className="text-xs text-muted-foreground">
                {campaignStats?.total || 0} total campaigns
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recipientStats?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">Across all campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gift Cards Delivered</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{giftCardStats?.delivered || 0}</div>
              <p className="text-xs text-muted-foreground">
                ${((giftCardStats?.totalValue || 0) / 100).toFixed(2)} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls Completed</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callStats?.completed || 0}</div>
              <p className="text-xs text-muted-foreground">
                ~{callStats?.avgDuration || 0} min avg duration
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        {recentActivity && recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="qr_scans" stroke="#3b82f6" name="QR Scans" />
                  <Line type="monotone" dataKey="form_submissions" stroke="#8b5cf6" name="Forms" />
                  <Line type="monotone" dataKey="purl_views" stroke="#10b981" name="PURL Views" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Campaigns */}
        {topCampaigns && topCampaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCampaigns} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#3b82f6" name="Engagement" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campaign Status</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mailed</span>
                  <span className="font-medium">{campaignStats?.mailed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{campaignStats?.completed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Draft</span>
                  <span className="font-medium">{campaignStats?.draft || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gift Card Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivered</span>
                  <span className="font-medium">{giftCardStats?.delivered || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Redeemed</span>
                  <span className="font-medium">{giftCardStats?.redeemed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Redemption Rate</span>
                  <span className="font-medium">
                    {giftCardStats?.delivered 
                      ? ((giftCardStats.redeemed / giftCardStats.delivered) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Call Center Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium">{callStats?.completed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">In Progress</span>
                  <span className="font-medium">{callStats?.inProgress || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Duration</span>
                  <span className="font-medium">{callStats?.avgDuration || 0} min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
