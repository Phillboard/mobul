import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface MessageTemplate {
  id: string;
  client_id: string;
  template_type: 'sms' | 'email';
  name: string;
  subject?: string;
  body_template: string;
  available_merge_tags: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useMessageTemplates(templateType?: 'sms' | 'email') {
  const { currentClient } = useTenant();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message-templates', currentClient?.id, templateType],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (templateType) {
        query = query.eq('template_type', templateType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: !!currentClient?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at' | 'available_merge_tags'>) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          ...template,
          client_id: currentClient?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
}

/**
 * Render template with merge tags
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Replace all {{tag}} with actual values
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value || ''));
  });
  
  // Remove any unreplaced tags
  rendered = rendered.replace(/{{[^}]+}}/g, '');
  
  return rendered;
}

/**
 * Extract merge tags from template
 */
export function extractMergeTags(template: string): string[] {
  const matches = template.match(/{{([^}]+)}}/g) || [];
  return matches.map(match => match.replace(/[{}]/g, ''));
}

/**
 * Validate template has required merge tags
 */
export function validateTemplate(template: string, requiredTags: string[]): { valid: boolean; missing: string[] } {
  const tags = extractMergeTags(template);
  const missing = requiredTags.filter(tag => !tags.includes(tag));
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

