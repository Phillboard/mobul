import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ValidationResult {
  isValid: boolean;
  checks: {
    label: string;
    status: 'success' | 'warning' | 'error';
    message?: string;
  }[];
}

interface CampaignFormData {
  name?: string;
  template_id?: string | null;
  size?: string;
  contact_list_id?: string;
  audience_id?: string; // Legacy
  conditions?: any[];
  lp_mode?: string;
  mailing_method?: 'self' | 'ace_fulfillment';
}

export function useCampaignValidation(formData: CampaignFormData, clientId: string): ValidationResult {
  // Support both new contact_list_id and legacy audience_id
  const listOrAudienceId = formData.contact_list_id || formData.audience_id;
  
  const { data: contactList } = useQuery({
    queryKey: ['contact-list', listOrAudienceId],
    queryFn: async () => {
      if (!listOrAudienceId) return null;
      
      // Try contact_lists first
      if (formData.contact_list_id) {
        const { data, error } = await supabase
          .from('contact_lists')
          .select('contact_count')
          .eq('id', formData.contact_list_id)
          .single();
        if (error) throw error;
        return { count: data.contact_count || 0 };
      }
      
      // Fall back to legacy audiences
      if (formData.audience_id) {
        const { data, error } = await supabase
          .from('audiences')
          .select('valid_count')
          .eq('id', formData.audience_id)
          .single();
        if (error) throw error;
        return { count: data.valid_count || 0 };
      }
      
      return null;
    },
    enabled: !!listOrAudienceId,
  });

  const { data: pools } = useQuery({
    queryKey: ['gift-card-pools', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_pools')
        .select('id, pool_name, available_cards')
        .eq('client_id', clientId);
      if (error) throw error;
      return data;
    },
  });

  const { data: mailProvider } = useQuery({
    queryKey: ['mail-provider', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mail_provider_settings')
        .select('provider_type, postgrid_enabled, custom_enabled')
        .eq('client_id', clientId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  return useMemo(() => {
    const checks = [];
    const isSelfMailer = formData.mailing_method === 'self';

    // Check 1: Campaign name
    if (formData.name && formData.name.length > 0) {
      checks.push({ label: 'Campaign name set', status: 'success' as const });
    } else {
      checks.push({ label: 'Campaign name missing', status: 'error' as const, message: 'Required' });
    }

    // Check 2: Template/Mail piece
    if (formData.template_id) {
      checks.push({ label: 'Mail piece selected', status: 'success' as const });
    } else {
      checks.push({ label: 'No mail piece selected', status: 'warning' as const, message: 'Can design later' });
    }

    // Check 3: Mail size (optional for self-mailers, required for ACE fulfillment)
    if (formData.size) {
      checks.push({ label: 'Mail size configured', status: 'success' as const });
    } else if (!isSelfMailer) {
      checks.push({ label: 'Mail size missing', status: 'error' as const, message: 'Required for ACE fulfillment' });
    }

    // Check 4: Recipients (List/Segment or legacy Audience)
    if (listOrAudienceId && contactList) {
      checks.push({ 
        label: `Recipients selected (${contactList.count} contacts)`, 
        status: 'success' as const 
      });
    } else {
      checks.push({ label: 'No recipients selected', status: 'error' as const, message: 'Required' });
    }

    // Check 5: Conditions (required - must have at least one)
    if (formData.conditions && formData.conditions.length > 0) {
      checks.push({ 
        label: `${formData.conditions.length} condition(s) configured`, 
        status: 'success' as const 
      });
    } else {
      checks.push({ 
        label: 'No reward conditions configured', 
        status: 'error' as const, 
        message: 'At least one condition with gift card required' 
      });
    }

    // Check 6: PURL settings
    if (formData.lp_mode) {
      checks.push({ label: 'Tracking settings configured', status: 'success' as const });
    } else {
      checks.push({ label: 'PURL settings missing', status: 'warning' as const });
    }

    // Check 7: Mail provider (required for ACE fulfillment, optional for self-mailers)
    if (mailProvider && (mailProvider.postgrid_enabled || mailProvider.custom_enabled)) {
      checks.push({ label: 'Mail provider configured', status: 'success' as const });
    } else if (!isSelfMailer) {
      checks.push({ 
        label: 'Mail provider not configured', 
        status: 'error' as const, 
        message: 'Required for ACE fulfillment - Configure in Settings' 
      });
    } else {
      checks.push({ 
        label: 'Mail provider not configured', 
        status: 'warning' as const, 
        message: 'Optional for self-mailers (used for analytics only)' 
      });
    }

    const isValid = checks.every(check => check.status !== 'error');

    return { isValid, checks };
  }, [formData, contactList, pools, mailProvider]);
}
