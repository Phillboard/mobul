import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Deal {
  id: string;
  client_id: string;
  external_crm_id?: string;
  sync_source?: string;
  deal_name: string;
  amount?: number;
  currency: string;
  primary_contact_id?: string;
  company_id?: string;
  pipeline_id: string;
  stage_id: string;
  stage_order: number;
  probability: number;
  weighted_value?: number;
  expected_close_date?: string;
  close_date?: string;
  owner_user_id?: string;
  deal_source?: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  loss_reason?: string;
  win_reason?: string;
  custom_fields?: Record<string, any>;
  campaign_id?: string;
  last_sync_at?: string;
  sync_status?: string;
  created_at: string;
  updated_at: string;
  contacts?: any;
  companies?: any;
  profiles?: any;
  pipelines?: any;
}

export interface DealFilters {
  pipeline_id?: string;
  stage_id?: string;
  status?: string;
  owner_user_id?: string;
  search?: string;
}

export function useDeals(clientId: string | null, filters?: DealFilters) {
  return useQuery({
    queryKey: ["deals", clientId, filters],
    queryFn: async () => {
      if (!clientId) return [];

      let query = (supabase as any)
        .from("deals")
        .select(`
          *,
          contacts:primary_contact_id(id, first_name, last_name, email),
          companies:company_id(id, company_name),
          profiles:owner_user_id(id, full_name)
        `)
        .eq("client_id", clientId)
        .order("stage_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (filters?.pipeline_id) {
        query = query.eq("pipeline_id", filters.pipeline_id);
      }
      if (filters?.stage_id) {
        query = query.eq("stage_id", filters.stage_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.owner_user_id) {
        query = query.eq("owner_user_id", filters.owner_user_id);
      }
      if (filters?.search) {
        query = query.ilike("deal_name", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Deal[];
    },
    enabled: !!clientId,
  });
}

export function useDeal(dealId: string | null) {
  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      if (!dealId) return null;

      const { data, error } = await (supabase as any)
        .from("deals")
        .select(`
          *,
          contacts:primary_contact_id(id, first_name, last_name, email, phone),
          companies:company_id(id, company_name, website),
          profiles:owner_user_id(id, full_name, email),
          pipelines(id, pipeline_name, stages)
        `)
        .eq("id", dealId)
        .single();

      if (error) throw error;
      return data as unknown as Deal;
    },
    enabled: !!dealId,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: Partial<Deal>) => {
      const { data, error } = await (supabase as any)
        .from("deals")
        .insert([deal])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create deal: " + error.message);
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal"] });
      toast.success("Deal updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update deal: " + error.message);
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("deals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete deal: " + error.message);
    },
  });
}

export function useDealActivities(dealId: string | null) {
  return useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: async () => {
      if (!dealId) return [];

      const { data, error } = await (supabase as any)
        .from("deal_activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });
}

export function usePipelineMetrics(clientId: string | null, pipelineId?: string) {
  return useQuery({
    queryKey: ["pipeline-metrics", clientId, pipelineId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await (supabase as any)
        .rpc("get_pipeline_metrics", {
          p_client_id: clientId,
          p_pipeline_id: pipelineId || null,
        });

      if (error) throw error;
      return data[0];
    },
    enabled: !!clientId,
  });
}
