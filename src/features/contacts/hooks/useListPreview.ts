import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

export function useListPreview(listId: string | undefined, tagFilters: string[] = []) {
  return useQuery({
    queryKey: ['list-preview', listId, tagFilters],
    queryFn: async () => {
      if (!listId) return [];
      
      // Get contacts via list membership
      const query = supabase
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
        .eq('list_id', listId);
      
      const { data: members, error } = await query;
      
      if (error) throw error;
      
      // Transform and filter the data
      let contacts = members?.map(m => {
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

      // Apply tag filtering if specified
      if (tagFilters.length > 0) {
        contacts = contacts.filter(contact => 
          tagFilters.every(tag => contact.tags.includes(tag))
        );
      }

      return contacts;
    },
    enabled: !!listId,
  });
}
