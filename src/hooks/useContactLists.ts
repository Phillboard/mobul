import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@core/auth/AuthProvider";
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
      
      // Transform to include proper count
      return (data as any[])?.map(list => ({
        ...list,
        contact_count: Array.isArray(list.contact_list_members) 
          ? list.contact_list_members[0]?.count || 0 
          : 0
      })) as ContactList[];
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
    mutationFn: async ({ 
      listId, 
      contactIds,
      uniqueCodes 
    }: { 
      listId: string; 
      contactIds: string[];
      // Optional map of contactId -> uniqueCode for per-list codes
      uniqueCodes?: Record<string, string>;
    }) => {
      // Get existing members to avoid duplicates
      const { data: existingMembers } = await supabase
        .from("contact_list_members")
        .select("contact_id")
        .eq("list_id", listId)
        .in("contact_id", contactIds);

      const existingContactIds = new Set(existingMembers?.map(m => m.contact_id) || []);
      
      // Filter out contacts that are already in the list
      const newContactIds = contactIds.filter(id => !existingContactIds.has(id));

      if (newContactIds.length === 0) {
        return { skipped: contactIds.length, added: 0 };
      }

      const members = newContactIds.map((contactId) => ({
        list_id: listId,
        contact_id: contactId,
        added_by_user_id: user?.id,
        // Store unique code on list membership for per-campaign codes
        unique_code: uniqueCodes?.[contactId] || null,
      }));

      const { error } = await supabase.from("contact_list_members").insert(members);

      if (error) throw error;
      
      return { skipped: contactIds.length - newContactIds.length, added: newContactIds.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["list-members", variables.listId] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      
      if (result.added > 0) {
        const message = result.skipped > 0 
          ? `${result.added} contact(s) added, ${result.skipped} already in list`
          : `${result.added} contact(s) added to list`;
        toast.success(message);
      } else {
        toast.info("All selected contacts are already in this list");
      }
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
