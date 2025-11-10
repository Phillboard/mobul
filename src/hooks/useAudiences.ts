import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Audience {
  id: string;
  client_id: string;
  name: string;
  source: 'import' | 'purchase' | 'manual';
  total_count: number;
  valid_count: number;
  invalid_count: number;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  hygiene_json?: any;
}

export interface Recipient {
  id: string;
  audience_id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  zip4: string | null;
  email: string | null;
  phone: string | null;
  token: string;
  validation_status: 'valid' | 'invalid' | 'suppressed';
  created_at: string;
}

export function useAudiences(clientId?: string) {
  return useQuery({
    queryKey: ['audiences', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Audience[];
    },
    enabled: !!clientId,
  });
}

export function useAudience(audienceId?: string) {
  return useQuery({
    queryKey: ['audience', audienceId],
    queryFn: async () => {
      if (!audienceId) return null;
      
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('id', audienceId)
        .single();

      if (error) throw error;
      return data as Audience;
    },
    enabled: !!audienceId,
  });
}

export function useRecipients(
  audienceId?: string, 
  page = 1, 
  pageSize = 50, 
  search = '', 
  validationFilter: 'valid' | 'invalid' | 'suppressed' | '' = ''
) {
  return useQuery({
    queryKey: ['recipients', audienceId, page, pageSize, search, validationFilter],
    queryFn: async () => {
      if (!audienceId) return { data: [], count: 0 };
      
      let query = supabase
        .from('recipients')
        .select('*', { count: 'exact' })
        .eq('audience_id', audienceId);

      // Apply search filter
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,address1.ilike.%${search}%,city.ilike.%${search}%`);
      }

      // Apply validation status filter
      if (validationFilter) {
        query = query.eq('validation_status', validationFilter as 'valid' | 'invalid' | 'suppressed');
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: data as Recipient[], count: count || 0 };
    },
    enabled: !!audienceId,
  });
}

export function useDeleteAudience() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (audienceId: string) => {
      const { error } = await supabase
        .from('audiences')
        .delete()
        .eq('id', audienceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      toast({
        title: 'Audience deleted',
        description: 'The audience and all recipients have been removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAudienceStats(audienceId?: string) {
  return useQuery({
    queryKey: ['audience-stats', audienceId],
    queryFn: async () => {
      if (!audienceId) return null;

      // Get geographic distribution
      const { data: geoData, error: geoError } = await supabase
        .from('recipients')
        .select('state')
        .eq('audience_id', audienceId);

      if (geoError) throw geoError;

      const stateCounts = geoData.reduce((acc: Record<string, number>, item) => {
        acc[item.state] = (acc[item.state] || 0) + 1;
        return acc;
      }, {});

      // Get validation breakdown
      const { data: validationData, error: validationError } = await supabase
        .from('recipients')
        .select('validation_status')
        .eq('audience_id', audienceId);

      if (validationError) throw validationError;

      const validationCounts = validationData.reduce((acc: Record<string, number>, item) => {
        acc[item.validation_status] = (acc[item.validation_status] || 0) + 1;
        return acc;
      }, {});

      return {
        geographic: Object.entries(stateCounts)
          .map(([state, count]) => ({ state, count }))
          .sort((a, b) => b.count - a.count),
        validation: validationCounts,
      };
    },
    enabled: !!audienceId,
  });
}
