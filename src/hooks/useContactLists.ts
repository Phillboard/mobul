import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ContactList, ContactListFormData } from "@/types/contacts";

export function useContactLists(type?: "static" | "dynamic") {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: ["contact-lists", currentClient?.id, type],
    queryFn: async () => {
      if (!currentClient?.id) throw new Error("No client selected");

      let query = supabase
        .from("contact_lists")
        .select("*, contact_list_members(count)")
        .eq("client_id", currentClient.id)
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("list_type", type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContactList[];
    },
    enabled: !!currentClient?.id,
  });
}

export function useContactList(id?: string) {
  return useQuery({
    queryKey: ["contact-list", id],
    queryFn: async () => {
      if (!id) throw new Error("No list ID");

      const { data, error } = await supabase
        .from("contact_lists")
        .select("*, contact_list_members(count)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ContactList;
    },
    enabled: !!id,
  });
}

export function useListMembers(listId?: string) {
  return useQuery({
    queryKey: ["list-members", listId],
    queryFn: async () => {
      if (!listId) throw new Error("No list ID");

      const { data, error } = await supabase
        .from("contact_list_members")
        .select("*, contacts(*)")
        .eq("list_id", listId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
}

export function useCreateContactList() {
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ContactListFormData) => {
      if (!currentClient?.id) throw new Error("No client selected");

      const { data: list, error } = await supabase
        .from("contact_lists")
        .insert({
          ...data,
          client_id: currentClient.id,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return list;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("List created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create list");
    },
  });
}

export function useUpdateContactList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContactListFormData> }) => {
      const { data: list, error } = await supabase
        .from("contact_lists")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return list;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      queryClient.invalidateQueries({ queryKey: ["contact-list", variables.id] });
      toast.success("List updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update list");
    },
  });
}

export function useDeleteContactList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_lists").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("List deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete list");
    },
  });
}

export function useAddContactsToList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ listId, contactIds }: { listId: string; contactIds: string[] }) => {
      const members = contactIds.map((contactId) => ({
        list_id: listId,
        contact_id: contactId,
        added_by_user_id: user?.id,
      }));

      const { error } = await supabase.from("contact_list_members").insert(members);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-members", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("Contacts added to list");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add contacts to list");
    },
  });
}

export function useRemoveContactFromList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, contactId }: { listId: string; contactId: string }) => {
      const { error } = await supabase
        .from("contact_list_members")
        .delete()
        .eq("list_id", listId)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-members", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("Contact removed from list");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove contact from list");
    },
  });
}
