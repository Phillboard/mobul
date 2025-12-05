import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

export interface DocumentationPage {
  id: string;
  category: string;
  title: string;
  slug: string;
  file_path: string;
  content: string | null;
  order_index: number;
  is_admin_only: boolean;
  search_keywords: string[] | null;
  last_updated: string;
  created_at: string;
}

export function useDocumentation() {
  return useQuery({
    queryKey: ["documentation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_pages")
        .select("*")
        .order("category", { ascending: true })
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as DocumentationPage[];
    },
  });
}

export function useDocumentationPage(slug: string) {
  return useQuery({
    queryKey: ["documentation", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_pages")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;

      // Track view
      const { data: { user } } = await supabase.auth.getUser();
      if (user && data) {
        await supabase.from("documentation_views").insert({
          page_id: data.id,
          user_id: user.id,
        });
      }

      return data as DocumentationPage;
    },
    enabled: !!slug,
  });
}

export function useDocumentationSearch(query: string) {
  return useQuery({
    queryKey: ["documentation-search", query],
    queryFn: async () => {
      if (!query) return [];

      const { data, error } = await supabase
        .from("documentation_pages")
        .select("*")
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data as DocumentationPage[];
    },
    enabled: query.length > 2,
  });
}
