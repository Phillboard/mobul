/**
 * Marketing Campaigns Hook
 * 
 * Provides CRUD operations and state management for marketing campaigns.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from "sonner";
import type { 
  MarketingCampaign, 
  MarketingMessage, 
  MarketingCampaignWithMessages,
  CampaignFilters,
  CampaignType,
  CampaignStatus,
  AudienceType,
  AudienceConfig
} from '../types';

const QUERY_KEY = 'marketing-campaigns';

// ============================================================================
// LIST CAMPAIGNS
// ============================================================================

export function useMarketingCampaigns(filters?: CampaignFilters) {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: [QUERY_KEY, currentClient?.id, filters],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.campaign_type?.length) {
        query = query.in('campaign_type', filters.campaign_type);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from.toISOString());
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketingCampaign[];
    },
    enabled: !!currentClient?.id,
  });
}

// ============================================================================
// GET SINGLE CAMPAIGN
// ============================================================================

export function useMarketingCampaign(id: string | undefined) {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null;

      // Get campaign with messages
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;

      const { data: messages, error: messagesError } = await supabase
        .from('marketing_campaign_messages')
        .select('*')
        .eq('campaign_id', id)
        .order('sequence_order');

      if (messagesError) throw messagesError;

      return {
        ...campaign,
        messages: messages || [],
      } as MarketingCampaignWithMessages;
    },
    enabled: !!id && !!currentClient?.id,
  });
}

// ============================================================================
// CREATE CAMPAIGN
// ============================================================================

interface CreateCampaignInput {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  audience_type: AudienceType;
  audience_config: AudienceConfig;
  linked_mail_campaign_id?: string;
  scheduled_at?: string;
  messages: Omit<MarketingMessage, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>[];
}

export function useCreateMarketingCampaign() {
  const { currentClient } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      if (!currentClient?.id) throw new Error('No client selected');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert({
          client_id: currentClient.id,
          name: input.name,
          description: input.description,
          campaign_type: input.campaign_type,
          audience_type: input.audience_type,
          audience_config: input.audience_config,
          linked_mail_campaign_id: input.linked_mail_campaign_id,
          scheduled_at: input.scheduled_at,
          status: input.scheduled_at ? 'scheduled' : 'draft',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create messages
      if (input.messages && input.messages.length > 0) {
        const { error: messagesError } = await supabase
          .from('marketing_campaign_messages')
          .insert(
            input.messages.map((msg, index) => ({
              campaign_id: campaign.id,
              message_type: msg.message_type,
              template_id: msg.template_id,
              subject: msg.subject,
              body_html: msg.body_html,
              body_text: msg.body_text,
              sequence_order: index + 1,
              delay_minutes: msg.delay_minutes || 0,
            }))
          );

        if (messagesError) throw messagesError;
      }

      return campaign as MarketingCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Campaign "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE CAMPAIGN
// ============================================================================

interface UpdateCampaignInput {
  id: string;
  name?: string;
  description?: string;
  audience_type?: AudienceType;
  audience_config?: AudienceConfig;
  scheduled_at?: string | null;
  status?: CampaignStatus;
}

export function useUpdateMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCampaignInput) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Campaign "${data.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE CAMPAIGN
// ============================================================================

export function useDeleteMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// DUPLICATE CAMPAIGN
// ============================================================================

export function useDuplicateMarketingCampaign() {
  const { currentClient } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentClient?.id) throw new Error('No client selected');

      // Get original campaign with messages
      const { data: original, error: fetchError } = await supabase
        .from('marketing_campaigns')
        .select('*, marketing_campaign_messages(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create new campaign
      const { data: newCampaign, error: createError } = await supabase
        .from('marketing_campaigns')
        .insert({
          client_id: currentClient.id,
          name: `${original.name} (Copy)`,
          description: original.description,
          campaign_type: original.campaign_type,
          audience_type: original.audience_type,
          audience_config: original.audience_config,
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Duplicate messages
      if (original.marketing_campaign_messages?.length > 0) {
        const { error: msgError } = await supabase
          .from('marketing_campaign_messages')
          .insert(
            original.marketing_campaign_messages.map((msg: MarketingMessage) => ({
              campaign_id: newCampaign.id,
              message_type: msg.message_type,
              template_id: msg.template_id,
              subject: msg.subject,
              body_html: msg.body_html,
              body_text: msg.body_text,
              sequence_order: msg.sequence_order,
              delay_minutes: msg.delay_minutes,
            }))
          );

        if (msgError) throw msgError;
      }

      return newCampaign as MarketingCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Campaign duplicated as "${data.name}"`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to duplicate campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// SEND CAMPAIGN
// ============================================================================

export function useSendMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Update status to sending
      const { error: statusError } = await supabase
        .from('marketing_campaigns')
        .update({ 
          status: 'sending',
          started_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (statusError) throw statusError;

      // Invoke edge function to process sends
      const { error: sendError } = await supabase.functions.invoke('send-marketing-campaign', {
        body: { campaignId: id },
      });

      if (sendError) throw sendError;

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campaign sending started');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// PAUSE / RESUME CAMPAIGN
// ============================================================================

export function usePauseMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'paused' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campaign paused');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause campaign: ${error.message}`);
    },
  });
}

export function useResumeMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'sending' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campaign resumed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resume campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// CANCEL CAMPAIGN
// ============================================================================

export function useCancelMarketingCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Campaign cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// CAMPAIGN MESSAGES
// ============================================================================

export function useUpdateMarketingMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketingMessage> & { id: string }) => {
      const { data, error } = await supabase
        .from('marketing_campaign_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', data.campaign_id] });
      toast.success('Message updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update message: ${error.message}`);
    },
  });
}

export function useDeleteMarketingMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, campaignId }: { messageId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('marketing_campaign_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return campaignId;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', campaignId] });
      toast.success('Message deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete message: ${error.message}`);
    },
  });
}
