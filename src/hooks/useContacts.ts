import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Contact, ContactFormData, ContactFilters } from "@/types/contacts";

export function useContacts(filters?: ContactFilters) {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: ["contacts", currentClient?.id, filters],
    queryFn: async () => {
      if (!currentClient?.id) throw new Error("No client selected");

      let query = supabase
        .from("contacts")
        .select("*, contact_tags(*)")
        .eq("client_id", currentClient.id)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
        );
      }

      if (filters?.lifecycle_stage && filters.lifecycle_stage.length > 0) {
        query = query.in("lifecycle_stage", filters.lifecycle_stage);
      }

      if (filters?.has_email !== undefined) {
        query = filters.has_email ? query.not("email", "is", null) : query.is("email", null);
      }

      if (filters?.has_phone !== undefined) {
        query = filters.has_phone ? query.not("phone", "is", null) : query.is("phone", null);
      }

      if (filters?.do_not_contact !== undefined) {
        query = query.eq("do_not_contact", filters.do_not_contact);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!currentClient?.id,
  });
}

export function useContact(id?: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      if (!id) throw new Error("No contact ID");

      const { data, error } = await supabase
        .from("contacts")
        .select("*, contact_tags(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (!currentClient?.id) throw new Error("No client selected");

      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          ...data,
          client_id: currentClient.id,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create contact");
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContactFormData }) => {
      const { data: contact, error } = await supabase
        .from("contacts")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", variables.id] });
      toast.success("Contact updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update contact");
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete contact");
    },
  });
}

export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("contacts").delete().in("id", ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${ids.length} contact(s) deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete contacts");
    },
  });
}
