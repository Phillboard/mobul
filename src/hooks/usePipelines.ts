import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PipelineStage {
  id: string;
  name: string;
  probability: number;
  order: number;
  color?: string;
}

export interface Pipeline {
  id: string;
  client_id: string;
  pipeline_name: string;
  entity_type: string;
  is_default: boolean;
  stages: PipelineStage[];
  external_crm_pipeline_id?: string;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function usePipelines(clientId: string | null) {
  return useQuery({
    queryKey: ["pipelines", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await (supabase as any)
        .from("pipelines")
        .select("*")
        .eq("client_id", clientId)
        .order("is_default", { ascending: false })
        .order("pipeline_name", { ascending: true });

      if (error) throw error;
      return data as unknown as Pipeline[];
    },
    enabled: !!clientId,
  });
}

export function usePipeline(pipelineId: string | null) {
  return useQuery({
    queryKey: ["pipeline", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;

      const { data, error } = await (supabase as any)
        .from("pipelines")
        .select("*")
        .eq("id", pipelineId)
        .single();

      if (error) throw error;
      return data as unknown as Pipeline;
    },
    enabled: !!pipelineId,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pipeline: Partial<Pipeline>) => {
      const { data, error } = await (supabase as any)
        .from("pipelines")
        .insert([pipeline])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create pipeline: " + error.message);
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Pipeline> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("pipelines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Pipeline updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update pipeline: " + error.message);
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("pipelines")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      toast.success("Pipeline deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete pipeline: " + error.message);
    },
  });
}

export function useDefaultPipeline(clientId: string | null) {
  const { data: pipelines } = usePipelines(clientId);
  return pipelines?.find(p => p.is_default) || pipelines?.[0];
}
