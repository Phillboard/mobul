import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";

export function useCRMIntegrations(clientId: string | null) {
  return useQuery({
    queryKey: ['crm-integrations', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useCreateCRMIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integration: {
      client_id: string;
      campaign_id?: string;
      crm_provider: string;
      field_mappings: any;
      event_mappings: any;
    }) => {
      // Generate webhook URL and secret
      const webhookSecret = crypto.randomUUID();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      
      // We'll set the webhook_url after getting the ID
      const { data, error } = await supabase
        .from('crm_integrations')
        .insert({
          ...integration,
          webhook_secret: webhookSecret,
          webhook_url: 'placeholder', // Will update after insert
        })
        .select()
        .single();

      if (error) throw error;

      // Update with proper webhook URL including the ID
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/crm-webhook-receiver?integration_id=${data.id}`;
      
      const { data: updated, error: updateError } = await supabase
        .from('crm_integrations')
        .update({ webhook_url: webhookUrl })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('CRM integration created successfully');
    },
    onError: (error: any) => {
      console.error('Create integration error:', error);
      toast.error(error.message || 'Failed to create integration');
    },
  });
}

export function useUpdateCRMIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: any;
    }) => {
      const { data, error } = await supabase
        .from('crm_integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('Integration updated successfully');
    },
    onError: (error: any) => {
      console.error('Update integration error:', error);
      toast.error(error.message || 'Failed to update integration');
    },
  });
}

export function useDeleteCRMIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('Integration deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete integration error:', error);
      toast.error(error.message || 'Failed to delete integration');
    },
  });
}

export function useCRMEvents(integrationId: string | null) {
  return useQuery({
    queryKey: ['crm-events', integrationId],
    queryFn: async () => {
      if (!integrationId) return [];
      
      const { data, error } = await supabase
        .from('crm_events')
        .select('*')
        .eq('crm_integration_id', integrationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!integrationId,
  });
}

export function useTestCRMWebhook() {
  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      testPayload 
    }: { 
      integrationId: string; 
      testPayload: any;
    }) => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/crm-webhook-receiver?integration_id=${integrationId}`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Test webhook failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.matched) {
        toast.success(`Test successful! Recipient matched. ${data.condition_triggered ? `Condition #${data.condition_triggered} would trigger.` : ''}`);
      } else {
        toast.warning('Test received but no recipient matched. Check field mappings.');
      }
    },
    onError: (error: any) => {
      console.error('Test webhook error:', error);
      toast.error(error.message || 'Test webhook failed');
    },
  });
}