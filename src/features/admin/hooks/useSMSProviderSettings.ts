/**
 * Hook for managing SMS provider settings and priority
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useToast } from '@/shared/hooks/use-toast';

export type SMSProvider = 'notificationapi' | 'infobip' | 'twilio' | 'eztexting';

export interface SMSProviderSettings {
  id: string;
  primary_provider: SMSProvider;
  enable_fallback: boolean;
  fallback_provider_1: SMSProvider | null;
  fallback_provider_2: SMSProvider | null;
  fallback_provider_3: SMSProvider | null;
  fallback_on_error: boolean;
  notificationapi_enabled: boolean;
  infobip_enabled: boolean;
  twilio_enabled: boolean;
  eztexting_enabled: boolean;
}

export interface UpdateSMSProviderSettingsParams {
  primary_provider?: SMSProvider;
  enable_fallback?: boolean;
  fallback_provider_1?: SMSProvider | null;
  fallback_provider_2?: SMSProvider | null;
  fallback_provider_3?: SMSProvider | null;
  fallback_on_error?: boolean;
}

/**
 * Fetch SMS provider settings
 */
export function useSMSProviderSettings() {
  return useQuery({
    queryKey: ['sms-provider-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_provider_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as SMSProviderSettings;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Update SMS provider settings
 */
export function useUpdateSMSProviderSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: UpdateSMSProviderSettingsParams) => {
      const { data: settings } = await supabase
        .from('sms_provider_settings')
        .select('id')
        .limit(1)
        .single();

      if (!settings) {
        throw new Error('SMS provider settings not found');
      }

      const { data, error } = await supabase
        .from('sms_provider_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data as SMSProviderSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-provider-settings'] });
      queryClient.invalidateQueries({ queryKey: ['sms-provider-config'] });
      
      toast({
        title: 'Settings Updated',
        description: 'SMS provider priority has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
