import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMarkdownDoc(category: string, slug: string) {
  return useQuery({
    queryKey: ['documentation', category, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_pages")
        .select("*")
        .eq("category", category)
        .eq("slug", slug)
        .single();

      if (error) {
        console.error('Error loading documentation:', error);
        throw error;
      }

      return {
        title: data.title || "Documentation",
        content: data.content || "",
        category: data.category,
        slug: data.slug,
        id: data.id,
        visible_to_roles: data.visible_to_roles,
        doc_audience: data.doc_audience,
      };
    },
    enabled: !!category && !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
