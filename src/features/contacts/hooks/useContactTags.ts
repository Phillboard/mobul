import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

export function useContactTags(clientId: string) {
  return useQuery({
    queryKey: ['contact-tags', clientId],
    queryFn: async () => {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          id,
          contact_tags (
            tag,
            tag_category
          )
        `)
        .eq('client_id', clientId);

      if (error) throw error;

      // Extract unique tags with their categories
      const tagMap = new Map<string, { tag: string; category: string | null; count: number }>();
      
      contacts?.forEach(contact => {
        const tags = contact.contact_tags as any[];
        tags?.forEach(tagObj => {
          const key = tagObj.tag;
          if (tagMap.has(key)) {
            tagMap.get(key)!.count++;
          } else {
            tagMap.set(key, {
              tag: tagObj.tag,
              category: tagObj.tag_category,
              count: 1,
            });
          }
        });
      });

      return Array.from(tagMap.values()).sort((a, b) => a.tag.localeCompare(b.tag));
    },
  });
}
