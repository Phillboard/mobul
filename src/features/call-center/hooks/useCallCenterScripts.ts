import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";

export interface CallCenterScript {
  id: string;
  client_id: string;
  campaign_id?: string;
  script_name: string;
  script_type: 'greeting' | 'verification' | 'explanation' | 'objection_handling' | 'closing' | 'escalation';
  script_content: string;
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useCallCenterScripts = (clientId?: string, campaignId?: string) => {
  const queryClient = useQueryClient();

  // Default fallback scripts when no database scripts exist
  const defaultScripts: CallCenterScript[] = [
    {
      id: 'default-greeting',
      client_id: '',
      script_name: 'Default Greeting',
      script_type: 'greeting',
      script_content: 'Thank you for calling! May I have your confirmation code to look up your gift card?',
      is_active: true,
      display_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'default-verification',
      client_id: '',
      script_name: 'Default Verification',
      script_type: 'verification',
      script_content: 'Let me look that up for you... Great! I found your record. Can I verify your name is {{first_name}} {{last_name}}?',
      is_active: true,
      display_order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'default-explanation',
      client_id: '',
      script_name: 'Default Gift Card Explanation',
      script_type: 'explanation',
      script_content: 'Excellent! You qualify for a gift card as part of the {{campaign_name}} campaign. I just need to confirm a few details to send it to you.',
      is_active: true,
      display_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'default-closing',
      client_id: '',
      script_name: 'Default Closing',
      script_type: 'closing',
      script_content: 'Your gift card has been sent! You should receive it shortly. Is there anything else I can help you with today?',
      is_active: true,
      display_order: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const { data: scripts, isLoading, error } = useQuery({
    queryKey: ['call-center-scripts', clientId, campaignId],
    queryFn: async () => {
      // If no clientId, return default scripts
      if (!clientId) {
        return defaultScripts;
      }

      let query = supabase
        .from('call_center_scripts')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (campaignId) {
        query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // If no scripts found in database, return defaults
      if (!data || data.length === 0) {
        return defaultScripts;
      }
      
      return data as CallCenterScript[];
    },
    // Always enable the query - it will return defaults if needed
    enabled: true,
  });

  const createScript = useMutation({
    mutationFn: async (newScript: Omit<CallCenterScript, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('call_center_scripts')
        .insert(newScript)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-center-scripts'] });
      toast.success('Script created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create script: ' + error.message);
    },
  });

  const updateScript = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CallCenterScript> }) => {
      const { data, error } = await supabase
        .from('call_center_scripts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-center-scripts'] });
      toast.success('Script updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update script: ' + error.message);
    },
  });

  const deleteScript = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('call_center_scripts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-center-scripts'] });
      toast.success('Script deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete script: ' + error.message);
    },
  });

  const reorderScripts = useMutation({
    mutationFn: async (reorderedScripts: { id: string; display_order: number }[]) => {
      const updates = reorderedScripts.map(({ id, display_order }) =>
        supabase
          .from('call_center_scripts')
          .update({ display_order })
          .eq('id', id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-center-scripts'] });
      toast.success('Scripts reordered successfully');
    },
    onError: (error) => {
      toast.error('Failed to reorder scripts: ' + error.message);
    },
  });

  return {
    scripts: scripts || [],
    isLoading,
    error,
    createScript,
    updateScript,
    deleteScript,
    reorderScripts,
  };
};
