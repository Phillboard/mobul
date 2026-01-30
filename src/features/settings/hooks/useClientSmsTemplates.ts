/**
 * useClientSmsTemplates Hook
 * 
 * Manages client-level default SMS templates with A2P validation.
 * Handles CRUD operations against the message_templates table.
 * 
 * Only 3 template types exist:
 * 1. opt_in_request - Sent to request consent
 * 2. opt_in_confirmation - Sent when user replies YES (can be disabled)
 * 3. gift_card_delivery - Sent when gift card is provisioned
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { toast } from 'sonner';
import {
  validateSmsTemplate,
  SMS_TEMPLATE_TYPES,
  type SmsTemplateType,
  type A2PValidationResult,
} from '@/shared/utils/a2pValidation';

// Template data structure
export interface SmsTemplateData {
  id?: string;
  type: SmsTemplateType;
  body: string;
  isDefault: boolean;
  enabled: boolean;        // Can be disabled for opt_in_confirmation
  validation: A2PValidationResult;
}

// Database row structure
interface MessageTemplateRow {
  id: string;
  client_id: string;
  template_type: 'sms' | 'email';
  name: string;
  body_template: string;
  available_merge_tags: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch default SMS templates for a client
 */
export function useClientSmsTemplates(clientId: string | null) {
  return useQuery({
    queryKey: ['client-sms-templates', clientId],
    queryFn: async (): Promise<Record<SmsTemplateType, SmsTemplateData>> => {
      if (!clientId) {
        throw new Error('Client ID required');
      }

      // Fetch existing templates
      const { data: templates, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('client_id', clientId)
        .eq('template_type', 'sms')
        .eq('is_default', true);

      if (error) {
        console.error('Error fetching SMS templates:', error);
        throw error;
      }

      // Map database templates to our structure
      const templateMap: Record<SmsTemplateType, SmsTemplateData> = {} as any;

      // Initialize with defaults for all 3 types
      for (const [type, config] of Object.entries(SMS_TEMPLATE_TYPES)) {
        const templateType = type as SmsTemplateType;
        const existing = templates?.find(t => t.name === templateType);
        
        // Empty string body means disabled (for opt_in_confirmation)
        const isDisabled = existing?.body_template === '';
        const body = isDisabled ? config.defaultTemplate : (existing?.body_template || config.defaultTemplate);
        
        templateMap[templateType] = {
          id: existing?.id,
          type: templateType,
          body,
          isDefault: !existing || isDisabled, // True if using system default
          enabled: !isDisabled, // Disabled if body is empty string
          validation: validateSmsTemplate(body, templateType),
        };
      }

      return templateMap;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Save SMS templates for a client
 */
export function useSaveClientSmsTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      templates,
    }: {
      clientId: string;
      templates: Record<SmsTemplateType, SmsTemplateData>;
    }) => {
      // Validate all enabled templates before saving
      const errors: string[] = [];
      for (const [type, template] of Object.entries(templates)) {
        // Skip validation for disabled templates
        if (!template.enabled && type === 'opt_in_confirmation') {
          continue;
        }
        if (!template.validation.isValid) {
          const typeConfig = SMS_TEMPLATE_TYPES[type as SmsTemplateType];
          errors.push(`${typeConfig.label}: ${template.validation.errors.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`A2P Compliance Errors:\n${errors.join('\n')}`);
      }

      // Upsert each template
      const operations = Object.entries(templates).map(async ([type, template]) => {
        const templateType = type as SmsTemplateType;
        const config = SMS_TEMPLATE_TYPES[templateType];
        
        // For opt_in_confirmation, store empty string to indicate disabled
        const bodyToStore = templateType === 'opt_in_confirmation' && !template.enabled
          ? ''
          : template.body;
        
        // Skip if using system default (no customization) and enabled
        if (template.body === config.defaultTemplate && template.enabled && !template.id) {
          return null;
        }

        const templateData = {
          client_id: clientId,
          template_type: 'sms' as const,
          name: templateType,
          body_template: bodyToStore,
          available_merge_tags: config.variables,
          is_default: true,
          updated_at: new Date().toISOString(),
        };

        if (template.id) {
          // Update existing
          const { error } = await supabase
            .from('message_templates')
            .update(templateData)
            .eq('id', template.id);

          if (error) throw error;
        } else if (bodyToStore !== config.defaultTemplate || !template.enabled) {
          // Insert new only if customized or disabled
          const { error } = await supabase
            .from('message_templates')
            .insert({
              ...templateData,
              created_at: new Date().toISOString(),
            });

          if (error) throw error;
        }

        return templateType;
      });

      await Promise.all(operations);
      return { success: true };
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-sms-templates', clientId] });
      toast.success('SMS templates saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Reset a template to system default
 */
export function useResetTemplateToDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      templateId,
      templateType,
    }: {
      clientId: string;
      templateId: string;
      templateType: SmsTemplateType;
    }) => {
      // Delete the custom template to revert to system default
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return { templateType };
    },
    onSuccess: ({ templateType }, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['client-sms-templates', clientId] });
      toast.success(`${SMS_TEMPLATE_TYPES[templateType].label} reset to default`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset template: ${error.message}`);
    },
  });
}

/**
 * Get the effective template for a specific context
 * Resolves template hierarchy: condition -> campaign -> client default -> system default
 * Returns null for opt_in_confirmation if disabled
 */
export async function resolveEffectiveTemplate(
  templateType: SmsTemplateType,
  options: {
    conditionId?: string;
    campaignId?: string;
    clientId: string;
  }
): Promise<{ template: string; source: 'condition' | 'campaign' | 'client' | 'system'; enabled: boolean } | null> {
  const { conditionId, campaignId, clientId } = options;

  // 1. Check condition-specific template (for gift_card_delivery only)
  if (conditionId && templateType === 'gift_card_delivery') {
    const { data: condition } = await supabase
      .from('campaign_conditions')
      .select('sms_template')
      .eq('id', conditionId)
      .single();

    if (condition?.sms_template) {
      return { template: condition.sms_template, source: 'condition', enabled: true };
    }
  }

  // 2. Check campaign-specific template (for opt_in_request only)
  if (campaignId && templateType === 'opt_in_request') {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('sms_opt_in_message')
      .eq('id', campaignId)
      .single();

    if (campaign?.sms_opt_in_message) {
      return { template: campaign.sms_opt_in_message, source: 'campaign', enabled: true };
    }
  }

  // 3. Check client default template
  const { data: clientTemplate } = await supabase
    .from('message_templates')
    .select('body_template')
    .eq('client_id', clientId)
    .eq('template_type', 'sms')
    .eq('name', templateType)
    .eq('is_default', true)
    .single();

  if (clientTemplate) {
    // Empty body means disabled (for opt_in_confirmation)
    if (clientTemplate.body_template === '') {
      return null; // Template is disabled
    }
    if (clientTemplate.body_template) {
      return { template: clientTemplate.body_template, source: 'client', enabled: true };
    }
  }

  // 4. Fall back to system default
  return {
    template: SMS_TEMPLATE_TYPES[templateType].defaultTemplate,
    source: 'system',
    enabled: true,
  };
}

export default useClientSmsTemplates;
