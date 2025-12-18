/**
 * Content Library Hooks
 * 
 * Hooks for managing email and SMS templates in the Content Library.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useTenant } from "@/contexts/TenantContext";

export interface MarketingTemplate {
  id: string;
  client_id: string;
  name: string;
  type: 'email' | 'sms';
  category?: string | null;
  subject?: string | null;         // For email
  body_html?: string | null;       // For email
  body_text: string;               // For both
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  type: 'email' | 'sms';
  category?: string;
  subject?: string;
  body_html?: string;
  body_text: string;
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  category?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
}

/**
 * Fetch all marketing templates
 */
export function useMarketingTemplates(type?: 'email' | 'sms') {
  const { currentClient } = useTenant();
  
  return useQuery({
    queryKey: ['marketing-templates', currentClient?.id, type],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      
      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('name');
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketingTemplate[];
    },
    enabled: !!currentClient?.id,
  });
}

/**
 * Fetch a single marketing template
 */
export function useMarketingTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['marketing-template', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as MarketingTemplate;
    },
    enabled: !!id,
  });
}

/**
 * Create a new marketing template
 */
export function useCreateMarketingTemplate() {
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();
  
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!currentClient?.id) throw new Error('No client selected');
      
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          ...input,
          client_id: currentClient.id,
          usage_count: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MarketingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
    },
  });
}

/**
 * Update an existing marketing template
 */
export function useUpdateMarketingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTemplateInput) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MarketingTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-template', data.id] });
    },
  });
}

/**
 * Delete a marketing template
 */
export function useDeleteMarketingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
    },
  });
}

/**
 * Duplicate a marketing template
 */
export function useDuplicateMarketingTemplate() {
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentClient?.id) throw new Error('No client selected');
      
      // Fetch original template
      const { data: original, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create duplicate
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          name: `${original.name} (Copy)`,
          type: original.type,
          category: original.category,
          subject: original.subject,
          body_html: original.body_html,
          body_text: original.body_text,
          client_id: currentClient.id,
          usage_count: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MarketingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
    },
  });
}

/**
 * Get usage information for a template
 */
export function useTemplateUsage(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template-usage', templateId],
    queryFn: async () => {
      if (!templateId) return { broadcasts: [], automations: [], totalUsage: 0 };
      
      // Check broadcast messages
      const { data: broadcastMessages } = await supabase
        .from('marketing_campaign_messages')
        .select(`
          campaign_id,
          marketing_campaigns!inner (
            id,
            name,
            status
          )
        `)
        .eq('template_id', templateId);
      
      // Check automation steps
      const { data: automationSteps } = await supabase
        .from('marketing_automation_steps')
        .select(`
          automation_id,
          marketing_automations!inner (
            id,
            name,
            is_active
          )
        `)
        .eq('template_id', templateId);
      
      return {
        broadcasts: broadcastMessages || [],
        automations: automationSteps || [],
        totalUsage: (broadcastMessages?.length || 0) + (automationSteps?.length || 0),
      };
    },
    enabled: !!templateId,
  });
}
