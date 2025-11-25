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
  audience_id?: string;
  conditions?: any[];
  lp_mode?: string;
}

export function useCampaignValidation(formData: CampaignFormData, clientId: string): ValidationResult {
  const { data: audience } = useQuery({
    queryKey: ['audience', formData.audience_id],
    queryFn: async () => {
      if (!formData.audience_id) return null;
      const { data, error } = await supabase
        .from('audiences')
        .select('valid_count')
        .eq('id', formData.audience_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formData.audience_id,
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

    // Check 3: Mail size
    if (formData.size) {
      checks.push({ label: 'Mail size configured', status: 'success' as const });
    } else {
      checks.push({ label: 'Mail size missing', status: 'error' as const, message: 'Required' });
    }

    // Check 4: Audience
    if (formData.audience_id && audience) {
      checks.push({ 
        label: `Audience selected (${audience.valid_count} recipients)`, 
        status: 'success' as const 
      });
    } else {
      checks.push({ label: 'No audience selected', status: 'error' as const, message: 'Required' });
    }

    // Check 5: Gift card inventory
    if (formData.audience_id && audience && pools) {
      const hasEnoughInventory = pools.every(pool => pool.available_cards >= audience.valid_count);
      if (hasEnoughInventory) {
        checks.push({ label: 'Gift card inventory sufficient', status: 'success' as const });
      } else {
        checks.push({ 
          label: 'Low gift card inventory', 
          status: 'warning' as const, 
          message: 'Some pools may run out' 
        });
      }
    }

    // Check 6: Conditions
    if (formData.conditions && formData.conditions.length > 0) {
      checks.push({ 
        label: `${formData.conditions.length} condition(s) configured`, 
        status: 'success' as const 
      });
    } else {
      checks.push({ 
        label: 'No conditions configured', 
        status: 'warning' as const, 
        message: 'Optional but recommended' 
      });
    }

    // Check 7: PURL settings
    if (formData.lp_mode) {
      checks.push({ label: 'PURL settings configured', status: 'success' as const });
    } else {
      checks.push({ label: 'PURL settings missing', status: 'warning' as const });
    }

    // Check 8: Mail provider
    if (mailProvider && (mailProvider.postgrid_enabled || mailProvider.custom_enabled)) {
      checks.push({ label: 'Mail provider configured', status: 'success' as const });
    } else {
      checks.push({ 
        label: 'Mail provider not configured', 
        status: 'error' as const, 
        message: 'Configure in Settings' 
      });
    }

    const isValid = checks.every(check => check.status !== 'error');

    return { isValid, checks };
  }, [formData, audience, pools, mailProvider]);
}
