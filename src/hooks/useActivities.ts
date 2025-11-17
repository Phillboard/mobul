import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Activity {
  id: string;
  client_id: string;
  external_crm_id?: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'sms' | 'whatsapp' | 'postal_mail';
  subject: string;
  description?: string;
  outcome?: string;
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  campaign_id?: string;
  user_id?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  completed_at?: string;
  reminder_at?: string;
  direction?: 'inbound' | 'outbound';
  disposition?: string;
  recording_url?: string;
  email_metadata?: Record<string, any>;
  sync_source?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  contacts?: any;
  companies?: any;
  deals?: any;
  profiles?: any;
}

export function useActivities(clientId: string | null, filters?: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  campaignId?: string;
  activityType?: string;
  userId?: string;
}) {
  return useQuery({
    queryKey: ['activities', clientId, filters],
    queryFn: async () => {
      if (!clientId) return [];
      
      let query = (supabase as any)
        .from('activities')
        .select(`
          *,
          contacts(first_name, last_name, email),
          companies(company_name),
          deals(deal_name),
          profiles(full_name, email)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId);
      }
      if (filters?.dealId) {
        query = query.eq('deal_id', filters.dealId);
      }
      if (filters?.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }
      if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!clientId,
  });
}

export function useActivity(activityId: string | null) {
  return useQuery({
    queryKey: ['activity', activityId],
    queryFn: async () => {
      if (!activityId) return null;
      
      const { data, error } = await (supabase as any)
        .from('activities')
        .select(`
          *,
          contacts(first_name, last_name, email, phone),
          companies(company_name),
          deals(deal_name),
          profiles(full_name, email)
        `)
        .eq('id', activityId)
        .single();
      
      if (error) throw error;
      return data as Activity;
    },
    enabled: !!activityId,
  });
}

export function useCreateActivity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Partial<Activity>) => {
      const { data, error } = await (supabase as any)
        .from('activities')
        .insert(activity)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity created",
        description: "The activity has been logged successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateActivity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Activity> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      toast({
        title: "Activity updated",
        description: "The activity has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteActivity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Activity deleted",
        description: "The activity has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
