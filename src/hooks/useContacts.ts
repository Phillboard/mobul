import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Contact {
  id: string;
  client_id: string;
  external_crm_id?: string;
  sync_source: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  company_id?: string;
  job_title?: string;
  department?: string;
  lifecycle_stage: string;
  lead_score: number;
  owner_user_id?: string;
  tags: string[];
  custom_fields: Record<string, any>;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  social_media: Record<string, string>;
  do_not_contact: boolean;
  email_opt_out: boolean;
  sms_opt_out: boolean;
  last_contacted_at?: string;
  next_follow_up_at?: string;
  last_sync_at?: string;
  sync_status: string;
  sync_direction: string;
  created_at: string;
  updated_at: string;
  companies?: {
    company_name: string;
  };
}

export function useContacts(clientId: string | null, filters?: {
  search?: string;
  lifecycle_stage?: string;
  owner_user_id?: string;
  tags?: string[];
}) {
  return useQuery({
    queryKey: ["contacts", clientId, filters],
    queryFn: async () => {
      if (!clientId) return [];

      let query = supabase
        .from("contacts" as any)
        .select(`
          *,
          companies (
            company_name
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters?.lifecycle_stage) {
        query = query.eq("lifecycle_stage", filters.lifecycle_stage);
      }

      if (filters?.owner_user_id) {
        query = query.eq("owner_user_id", filters.owner_user_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Contact[];
    },
    enabled: !!clientId,
  });
}

export function useContact(contactId: string | null) {
  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from("contacts" as any)
        .select(`
          *,
          companies (
            id,
            company_name,
            industry,
            website
          )
        `)
        .eq("id", contactId)
        .single();

      if (error) throw error;
      return data as unknown as Contact;
    },
    enabled: !!contactId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Partial<Contact>) => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact"] });
      toast.success("Contact updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts" as any)
        .delete()
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });
}

export function useFindDuplicates(clientId: string, contactData: {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}) {
  return useQuery({
    queryKey: ["contact-duplicates", clientId, contactData],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_duplicate_contacts" as any, {
        p_client_id: clientId,
        p_email: contactData.email || null,
        p_phone: contactData.phone || null,
        p_first_name: contactData.first_name || null,
        p_last_name: contactData.last_name || null,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!(clientId && (contactData.email || contactData.phone || (contactData.first_name && contactData.last_name))),
  });
}
