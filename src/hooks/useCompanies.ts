import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Company {
  id: string;
  client_id: string;
  external_crm_id?: string;
  sync_source: string;
  company_name: string;
  domain?: string;
  industry?: string;
  employee_count?: number;
  annual_revenue?: number;
  website?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  parent_company_id?: string;
  owner_user_id?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  last_sync_at?: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export function useCompanies(clientId: string | null, filters?: {
  search?: string;
  industry?: string;
}) {
  return useQuery({
    queryKey: ["companies", clientId, filters],
    queryFn: async () => {
      if (!clientId) return [];

      let query = supabase
        .from("companies" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("company_name");

      if (filters?.search) {
        query = query.ilike("company_name", `%${filters.search}%`);
      }

      if (filters?.industry) {
        query = query.eq("industry", filters.industry);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Company[];
    },
    enabled: !!clientId,
  });
}

export function useCompany(companyId: string | null) {
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data as unknown as Company;
    },
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: Partial<Company>) => {
      const { data, error } = await supabase
        .from("companies" as any)
        .insert(company)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create company: ${error.message}`);
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Company> }) => {
      const { data, error } = await supabase
        .from("companies" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Company updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update company: ${error.message}`);
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from("companies" as any)
        .delete()
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete company: ${error.message}`);
    },
  });
}
