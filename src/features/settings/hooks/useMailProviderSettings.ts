import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useToast } from '@/shared/hooks';
import { useTenant } from "@/contexts/TenantContext";

export type SettingsLevel = 'organization' | 'client';

export interface MailProviderSettings {
  id?: string;
  org_id?: string | null;
  client_id?: string | null;
  provider_type: 'postgrid' | 'custom' | 'both';
  postgrid_enabled: boolean;
  postgrid_test_mode: boolean;
  postgrid_api_key_name?: string | null;
  custom_enabled: boolean;
  custom_webhook_url?: string | null;
  custom_webhook_secret_name?: string | null;
  custom_provider_name?: string | null;
  custom_auth_type?: 'api_key' | 'basic' | 'bearer' | 'custom_header' | 'none' | null;
  custom_auth_header_name?: string | null;
  allow_clients_postgrid?: boolean;
  allow_clients_custom?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SaveSettingsParams {
  data: Partial<MailProviderSettings>;
  level: SettingsLevel;
  targetOrgId?: string;
  targetClientId?: string;
}

export function useMailProviderSettings() {
  const { currentClient, currentOrg } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings for current context (org or client)
  const { data: settings, isLoading } = useQuery({
    queryKey: ["mail-provider-settings", currentOrg?.id, currentClient?.id],
    queryFn: async () => {
      // First try to get client-level settings
      if (currentClient?.id) {
        const { data: clientSettings, error: clientError } = await supabase
          .from("mail_provider_settings")
          .select("*")
          .eq("client_id", currentClient.id)
          .maybeSingle();

        if (clientError && clientError.code !== 'PGRST116') throw clientError;
        if (clientSettings) return clientSettings as MailProviderSettings;
      }

      // Fall back to org-level settings
      if (currentOrg?.id) {
        const { data: orgSettings, error: orgError } = await supabase
          .from("mail_provider_settings")
          .select("*")
          .eq("org_id", currentOrg.id)
          .maybeSingle();

        if (orgError && orgError.code !== 'PGRST116') throw orgError;
        if (orgSettings) return orgSettings as MailProviderSettings;
      }

      return null;
    },
    enabled: !!(currentClient?.id || currentOrg?.id),
  });

  // Create or update settings
  const saveMutation = useMutation({
    mutationFn: async (params: SaveSettingsParams) => {
      const { data, level, targetOrgId, targetClientId } = params;
      
      // Validate that we have the required ID based on level
      if (level === 'organization') {
        const orgId = targetOrgId || currentOrg?.id;
        if (!orgId) {
          throw new Error('Organization ID is required for organization-level settings');
        }
        
        const settingsData: Partial<MailProviderSettings> & { org_id: string; client_id: null } = {
          provider_type: 'postgrid', // Default if not provided
          ...data,
          org_id: orgId,
          client_id: null,
        };

        if (settings?.id && settings.org_id === orgId) {
          // Update existing org-level settings
          const { data: updated, error } = await supabase
            .from("mail_provider_settings")
            .update(settingsData)
            .eq("id", settings.id)
            .select()
            .single();

          if (error) throw error;
          return updated as MailProviderSettings;
        } else {
          // Create new org-level settings
          const { data: created, error } = await supabase
            .from("mail_provider_settings")
            .insert([settingsData])
            .select()
            .single();

          if (error) throw error;
          return created as MailProviderSettings;
        }
      } else if (level === 'client') {
        const clientId = targetClientId || currentClient?.id;
        if (!clientId) {
          throw new Error('Client ID is required for client-level settings');
        }
        
        const settingsData: Partial<MailProviderSettings> & { org_id: null; client_id: string } = {
          provider_type: 'postgrid', // Default if not provided
          ...data,
          org_id: null,
          client_id: clientId,
        };

        if (settings?.id && settings.client_id === clientId) {
          // Update existing client-level settings
          const { data: updated, error } = await supabase
            .from("mail_provider_settings")
            .update(settingsData)
            .eq("id", settings.id)
            .select()
            .single();

          if (error) throw error;
          return updated as MailProviderSettings;
        } else {
          // Create new client-level settings
          const { data: created, error } = await supabase
            .from("mail_provider_settings")
            .insert([settingsData])
            .select()
            .single();

          if (error) throw error;
          return created as MailProviderSettings;
        }
      } else {
        throw new Error('Invalid settings level');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail-provider-settings"] });
      toast({
        title: "Settings saved",
        description: "Mail provider settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
