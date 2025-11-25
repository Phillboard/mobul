import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useListPreview(listId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['list-preview', listId],
    queryFn: async () => {
      if (!listId) return null;
      
      // Get contacts via list membership
      const { data: members, error } = await supabase
        .from('contact_list_members')
        .select(`
          contact:contacts (
            id,
            first_name,
            last_name,
            email,
            phone,
            city,
            state,
            contact_tags (
              tag
            )
          )
        `)
        .eq('list_id', listId)
        .limit(5);
      
      if (error) throw error;
      
      // Transform the data
      return members?.map(m => {
        const contact = m.contact as any;
        return {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          city: contact.city,
          state: contact.state,
          tags: contact.contact_tags?.map((t: any) => t.tag) || [],
        };
      }) || [];
    },
    enabled: enabled && !!listId,
  });
}
