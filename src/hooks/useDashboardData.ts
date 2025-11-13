import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { subDays, format } from "date-fns";

export interface DashboardStats {
  activeCampaigns: number;
  totalRecipients: number;
  deliveryRate: number;
  responseRate: number;
  campaignTrend: number;
  recipientTrend: number;
  deliveryTrend: number;
  responseTrend: number;
}

export interface CampaignPerformance {
  date: string;
  mailed: number;
  delivered: number;
  qrScans: number;
  purlVisits: number;
  leads: number;
}

export interface RecentCampaign {
  id: string;
  name: string;
  status: string;
  audience_count: number;
  mail_date: string | null;
  delivered_count: number;
  qr_scans: number;
  leads: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  campaign_name: string;
}

export const useDashboardData = (dateRange: number = 30) => {
  const { currentClient } = useTenant();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", currentClient?.id, dateRange],
    queryFn: async () => {
      if (!currentClient?.id) return null;

      const startDate = subDays(new Date(), dateRange);
      const previousPeriodStart = subDays(startDate, dateRange);

      // Get campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, status, created_at")
        .eq("client_id", currentClient.id);

      // Get audiences
      const { data: audiences } = await supabase
        .from("audiences")
        .select("valid_count, created_at")
        .eq("client_id", currentClient.id);

      // Get events
      const { data: events } = await supabase
        .from("events")
        .select("event_type, created_at, campaign_id")
        .in("campaign_id", campaigns?.map(c => c.id) || []);

      const currentPeriodStart = startDate.toISOString();
      const previousStart = previousPeriodStart.toISOString();

      // Calculate stats
      const activeCampaigns = campaigns?.filter(c => 
        c.status === 'in_production' || c.status === 'mailed'
      ).length || 0;

      const totalRecipients = audiences?.reduce((sum, a) => sum + (a.valid_count || 0), 0) || 0;

      const deliveredCount = events?.filter(e => e.event_type === 'imb_delivered').length || 0;
      const mailedCount = events?.filter(e => e.event_type === 'imb_injected').length || 0;
      const deliveryRate = mailedCount > 0 ? (deliveredCount / mailedCount) * 100 : 0;

      const engagementEvents = events?.filter(e => 
        e.event_type === 'qr_scan' || e.event_type === 'purl_visit' || e.event_type === 'lead_captured'
      ).length || 0;
      const responseRate = deliveredCount > 0 ? (engagementEvents / deliveredCount) * 100 : 0;

      // Calculate trends
      const currentCampaigns = campaigns?.filter(c => c.created_at >= currentPeriodStart).length || 0;
      const previousCampaigns = campaigns?.filter(c => 
        c.created_at >= previousStart && c.created_at < currentPeriodStart
      ).length || 0;
      const campaignTrend = previousCampaigns > 0 ? 
        ((currentCampaigns - previousCampaigns) / previousCampaigns) * 100 : 0;

      const currentRecipients = audiences?.filter(a => a.created_at >= currentPeriodStart)
        .reduce((sum, a) => sum + (a.valid_count || 0), 0) || 0;
      const previousRecipients = audiences?.filter(a => 
        a.created_at >= previousStart && a.created_at < currentPeriodStart
      ).reduce((sum, a) => sum + (a.valid_count || 0), 0) || 0;
      const recipientTrend = previousRecipients > 0 ? 
        ((currentRecipients - previousRecipients) / previousRecipients) * 100 : 0;

      return {
        activeCampaigns,
        totalRecipients,
        deliveryRate,
        responseRate,
        campaignTrend,
        recipientTrend,
        deliveryTrend: 0, // Would need historical comparison
        responseTrend: 0, // Would need historical comparison
      } as DashboardStats;
    },
    enabled: !!currentClient?.id,
  });

  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ["campaign-performance", currentClient?.id, dateRange],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      const startDate = subDays(new Date(), dateRange);

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("client_id", currentClient.id);

      const { data: events } = await supabase
        .from("events")
        .select("event_type, occurred_at")
        .in("campaign_id", campaigns?.map(c => c.id) || [])
        .gte("occurred_at", startDate.toISOString())
        .order("occurred_at", { ascending: true });

      // Group events by day
      const groupedByDay: Record<string, CampaignPerformance> = {};

      events?.forEach(event => {
        const date = format(new Date(event.occurred_at), 'MMM dd');
        if (!groupedByDay[date]) {
          groupedByDay[date] = {
            date,
            mailed: 0,
            delivered: 0,
            qrScans: 0,
            purlVisits: 0,
            leads: 0,
          };
        }

        if (event.event_type === 'imb_injected') groupedByDay[date].mailed++;
        if (event.event_type === 'imb_delivered') groupedByDay[date].delivered++;
        if (event.event_type === 'qr_scan') groupedByDay[date].qrScans++;
        if (event.event_type === 'purl_visit') groupedByDay[date].purlVisits++;
        if (event.event_type === 'lead_captured') groupedByDay[date].leads++;
      });

      return Object.values(groupedByDay);
    },
    enabled: !!currentClient?.id,
  });

  const { data: recentCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["recent-campaigns", currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          status,
          mail_date,
          audience_id
        `)
        .eq("client_id", currentClient.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const result: RecentCampaign[] = [];

      for (const campaign of campaigns || []) {
        // Get audience count
        const { data: audience } = await supabase
          .from("audiences")
          .select("valid_count")
          .eq("id", campaign.audience_id)
          .single();

        // Get event counts
        const { data: events } = await supabase
          .from("events")
          .select("event_type")
          .eq("campaign_id", campaign.id);

        const delivered = events?.filter(e => e.event_type === 'imb_delivered').length || 0;
        const qrScans = events?.filter(e => e.event_type === 'qr_scan').length || 0;
        const leads = events?.filter(e => e.event_type === 'lead_captured').length || 0;

        result.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          audience_count: audience?.valid_count || 0,
          mail_date: campaign.mail_date,
          delivered_count: delivered,
          qr_scans: qrScans,
          leads: leads,
        });
      }

      return result;
    },
    enabled: !!currentClient?.id,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["recent-activity", currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("client_id", currentClient.id);

      const { data: events } = await supabase
        .from("events")
        .select("id, event_type, created_at, campaign_id")
        .in("campaign_id", campaigns?.map(c => c.id) || [])
        .order("created_at", { ascending: false })
        .limit(10);

      return events?.map(event => {
        const campaign = campaigns?.find(c => c.id === event.campaign_id);
        let description = "";

        switch (event.event_type) {
          case "imb_injected":
            description = "Campaign mailed";
            break;
          case "imb_delivered":
            description = "Mail piece delivered";
            break;
          case "qr_scan":
            description = "QR code scanned";
            break;
          case "purl_visit":
            description = "Landing page visited";
            break;
          case "lead_captured":
            description = "New lead captured";
            break;
          default:
            description = event.event_type;
        }

        return {
          id: event.id,
          type: event.event_type,
          description,
          timestamp: event.created_at,
          campaign_name: campaign?.name || "Unknown Campaign",
        };
      }) || [];
    },
    enabled: !!currentClient?.id,
  });

  return {
    stats,
    performance,
    recentCampaigns,
    activity,
    isLoading: statsLoading || performanceLoading || campaignsLoading || activityLoading,
  };
};
