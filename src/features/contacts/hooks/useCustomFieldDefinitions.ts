import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@app/providers/TenantProvider';
import { toast } from "sonner";

export interface CustomFieldDefinition {
  id: string;
  client_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi-select' | 'url' | 'email';
  options?: string[];
  is_required: boolean;
  default_value?: string;
  validation_rules?: Record<string, any>;
  field_group: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomFieldDefinitions() {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: ["custom-field-definitions", currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      const { data, error } = await supabase
        .from("contact_custom_field_definitions")
        .select("*")
        .eq("client_id", currentClient.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as CustomFieldDefinition[];
    },
    enabled: !!currentClient?.id,
  });
}

export function useCreateCustomFieldDefinition() {
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();

  return useMutation({
    mutationFn: async (definition: Omit<CustomFieldDefinition, "id" | "client_id" | "created_at" | "updated_at">) => {
      if (!currentClient?.id) throw new Error("No client selected");

      const { data, error } = await supabase
        .from("contact_custom_field_definitions")
        .insert({
          ...definition,
          client_id: currentClient.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] });
      toast.success("Custom field created");
    },
  });
}

export function useUpdateCustomFieldDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomFieldDefinition> & { id: string }) => {
      const { data, error } = await supabase
        .from("contact_custom_field_definitions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] });
      toast.success("Custom field updated");
    },
  });
}

export function useDeleteCustomFieldDefinition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_custom_field_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] });
      toast.success("Custom field deleted");
    },
  });
}