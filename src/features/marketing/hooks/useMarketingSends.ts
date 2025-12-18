/**
 * Marketing Sends Hook
 * 
 * Provides send tracking and analytics for marketing campaigns.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import type { MarketingSend, CampaignStats, SendStatus } from '../types';

const QUERY_KEY = 'marketing-sends';

// ============================================================================
// GET CAMPAIGN SENDS
// ============================================================================

interface SendsFilters {
  status?: SendStatus[];
  message_type?: ('email' | 'sms')[];
  page?: number;
  pageSize?: number;
}

export function useMarketingSends(campaignId: string | undefined, filters?: SendsFilters) {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  return useQuery({
    queryKey: [QUERY_KEY, campaignId, filters],
    queryFn: async () => {
      if (!campaignId) return { sends: [], total: 0 };

      let query = supabase
        .from('marketing_sends')
        .select('*, contacts(first_name, last_name, email, phone)', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.message_type?.length) {
        query = query.in('message_type', filters.message_type);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        sends: data as (MarketingSend & { contacts: { first_name: string; last_name: string; email: string; phone: string } | null })[],
        total: count || 0,
      };
    },
    enabled: !!campaignId,
  });
}

// ============================================================================
// GET CAMPAIGN STATS
// ============================================================================

export function useMarketingSendStats(campaignId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats', campaignId],
    queryFn: async (): Promise<CampaignStats> => {
      if (!campaignId) {
        return {
          total_recipients: 0,
          sent_count: 0,
          sent_percentage: 0,
          delivered_count: 0,
          delivery_rate: 0,
          opened_count: 0,
          open_rate: 0,
          clicked_count: 0,
          click_rate: 0,
          bounced_count: 0,
          bounce_rate: 0,
          unsubscribed_count: 0,
          unsubscribe_rate: 0,
          failed_count: 0,
        };
      }

      // Get aggregated stats from marketing_campaigns table
      const { data: campaign, error } = await supabase
        .from('marketing_campaigns')
        .select('total_recipients, sent_count, delivered_count, opened_count, clicked_count, bounced_count, unsubscribed_count')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      // Get failed count separately
      const { count: failedCount } = await supabase
        .from('marketing_sends')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'failed');

      const total = campaign.total_recipients || 1; // Avoid division by zero

      return {
        total_recipients: campaign.total_recipients,
        sent_count: campaign.sent_count,
        sent_percentage: (campaign.sent_count / total) * 100,
        delivered_count: campaign.delivered_count,
        delivery_rate: (campaign.delivered_count / Math.max(campaign.sent_count, 1)) * 100,
        opened_count: campaign.opened_count,
        open_rate: (campaign.opened_count / Math.max(campaign.delivered_count, 1)) * 100,
        clicked_count: campaign.clicked_count,
        click_rate: (campaign.clicked_count / Math.max(campaign.opened_count, 1)) * 100,
        bounced_count: campaign.bounced_count,
        bounce_rate: (campaign.bounced_count / Math.max(campaign.sent_count, 1)) * 100,
        unsubscribed_count: campaign.unsubscribed_count,
        unsubscribe_rate: (campaign.unsubscribed_count / Math.max(campaign.delivered_count, 1)) * 100,
        failed_count: failedCount || 0,
      };
    },
    enabled: !!campaignId,
  });
}

// ============================================================================
// GET CAMPAIGN RECIPIENTS
// ============================================================================

export function useCampaignRecipients(campaignId: string | undefined, filters?: SendsFilters) {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;

  return useQuery({
    queryKey: [QUERY_KEY, 'recipients', campaignId, filters],
    queryFn: async () => {
      if (!campaignId) return { recipients: [], total: 0 };

      // Get unique contacts with their latest send status
      const { data, error, count } = await supabase
        .from('marketing_sends')
        .select(`
          contact_id,
          recipient_email,
          recipient_phone,
          status,
          sent_at,
          delivered_at,
          opened_at,
          clicked_at,
          error_message,
          contacts(id, first_name, last_name, email, phone, company)
        `, { count: 'exact' })
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      return {
        recipients: data || [],
        total: count || 0,
      };
    },
    enabled: !!campaignId,
  });
}

// ============================================================================
// RETRY FAILED SENDS
// ============================================================================

export function useRetryFailedSends() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Invoke edge function to retry failed sends
      const { data, error } = await supabase.functions.invoke('retry-marketing-sends', {
        body: { campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, campaignId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'stats', campaignId] });
      toast.success('Retrying failed sends...');
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry sends: ${error.message}`);
    },
  });
}

// ============================================================================
// EXPORT SENDS
// ============================================================================

export function useExportSends() {
  return useMutation({
    mutationFn: async ({ campaignId, format = 'csv' }: { campaignId: string; format?: 'csv' | 'xlsx' }) => {
      const { data, error } = await supabase
        .from('marketing_sends')
        .select(`
          recipient_email,
          recipient_phone,
          message_type,
          status,
          sent_at,
          delivered_at,
          opened_at,
          clicked_at,
          error_message,
          contacts(first_name, last_name, company)
        `)
        .eq('campaign_id', campaignId);

      if (error) throw error;

      // Convert to CSV
      const headers = ['First Name', 'Last Name', 'Company', 'Email', 'Phone', 'Type', 'Status', 'Sent At', 'Delivered At', 'Opened At', 'Clicked At', 'Error'];
      const rows = data.map((send: any) => [
        send.contacts?.first_name || '',
        send.contacts?.last_name || '',
        send.contacts?.company || '',
        send.recipient_email || '',
        send.recipient_phone || '',
        send.message_type,
        send.status,
        send.sent_at || '',
        send.delivered_at || '',
        send.opened_at || '',
        send.clicked_at || '',
        send.error_message || '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-sends-${campaignId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    },
    onSuccess: () => {
      toast.success('Export downloaded');
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });
}

// ============================================================================
// DELIVERY TIMELINE (for charts)
// ============================================================================

export function useDeliveryTimeline(campaignId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'timeline', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      // Get sends grouped by hour
      const { data, error } = await supabase
        .from('marketing_sends')
        .select('sent_at, status')
        .eq('campaign_id', campaignId)
        .not('sent_at', 'is', null)
        .order('sent_at');

      if (error) throw error;

      // Group by hour
      const hourlyData: Record<string, { hour: string; sent: number; delivered: number; opened: number; clicked: number }> = {};

      data.forEach((send: any) => {
        const hour = new Date(send.sent_at).toISOString().slice(0, 13) + ':00:00';
        if (!hourlyData[hour]) {
          hourlyData[hour] = { hour, sent: 0, delivered: 0, opened: 0, clicked: 0 };
        }
        hourlyData[hour].sent++;
        if (['delivered', 'opened', 'clicked'].includes(send.status)) {
          hourlyData[hour].delivered++;
        }
        if (['opened', 'clicked'].includes(send.status)) {
          hourlyData[hour].opened++;
        }
        if (send.status === 'clicked') {
          hourlyData[hour].clicked++;
        }
      });

      return Object.values(hourlyData).sort((a, b) => a.hour.localeCompare(b.hour));
    },
    enabled: !!campaignId,
  });
}
