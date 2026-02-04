import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from "sonner";
import type { CustomFieldDefinition } from './useCustomFieldDefinitions';

export interface TemplateField {
  field_name: string;
  field_label: string;
  field_type: CustomFieldDefinition['field_type'];
  field_group: string;
  is_required: boolean;
  options?: string[];
}

export interface CustomFieldTemplate {
  id: string;
  org_id: string;
  template_name: string;
  industry: string | null;
  fields: TemplateField[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomFieldTemplates() {
  const { currentOrg } = useTenant();

  return useQuery({
    queryKey: ["custom-field-templates", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from("custom_field_templates")
        .select("*")
        .eq("org_id", currentOrg.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomFieldTemplate[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useCreateCustomFieldTemplate() {
  const queryClient = useQueryClient();
  const { currentOrg } = useTenant();

  return useMutation({
    mutationFn: async (template: {
      template_name: string;
      industry?: string;
      fields: TemplateField[];
    }) => {
      if (!currentOrg?.id) throw new Error("No organization selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("custom_field_templates")
        .insert({
          org_id: currentOrg.id,
          template_name: template.template_name,
          industry: template.industry || null,
          fields: template.fields,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-templates"] });
      toast.success("Template created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create template");
    },
  });
}

export function useUpdateCustomFieldTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomFieldTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("custom_field_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-templates"] });
      toast.success("Template updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });
}

export function useDeleteCustomFieldTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_field_templates")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-templates"] });
      toast.success("Template deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });
}

/**
 * Apply a template's fields to a client's custom field definitions.
 * Creates contact_custom_field_definitions rows for each template field,
 * skipping fields that already exist (by field_name).
 */
export function useApplyTemplateToClient() {
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();

  return useMutation({
    mutationFn: async (template: CustomFieldTemplate) => {
      if (!currentClient?.id) throw new Error("No client selected");

      // Get existing field definitions for this client
      const { data: existingFields } = await supabase
        .from("contact_custom_field_definitions")
        .select("field_name")
        .eq("client_id", currentClient.id)
        .eq("is_active", true);

      const existingNames = new Set((existingFields || []).map(f => f.field_name));

      // Filter out fields that already exist
      const newFields = template.fields.filter(f => !existingNames.has(f.field_name));

      if (newFields.length === 0) {
        return { created: 0, skipped: template.fields.length };
      }

      // Get max display_order
      const { data: maxOrderResult } = await supabase
        .from("contact_custom_field_definitions")
        .select("display_order")
        .eq("client_id", currentClient.id)
        .order("display_order", { ascending: false })
        .limit(1);

      let nextOrder = (maxOrderResult?.[0]?.display_order ?? -1) + 1;

      // Insert new field definitions
      const rows = newFields.map(field => ({
        client_id: currentClient.id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        field_group: field.field_group,
        is_required: field.is_required,
        options: field.options || [],
        display_order: nextOrder++,
        is_active: true,
        validation_rules: {},
      }));

      const { error } = await supabase
        .from("contact_custom_field_definitions")
        .insert(rows);

      if (error) throw error;

      return { created: newFields.length, skipped: template.fields.length - newFields.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["custom-field-templates"] });
      if (data.skipped > 0) {
        toast.success(`Applied ${data.created} fields (${data.skipped} already existed)`);
      } else {
        toast.success(`Applied ${data.created} fields to client`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to apply template");
    },
  });
}
