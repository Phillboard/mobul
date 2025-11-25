import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAudiencePreview(audienceId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['audience-preview', audienceId],
    queryFn: async () => {
      if (!audienceId) return null;
      
      const { data: recipients, error } = await supabase
        .from('recipients')
        .select('id, first_name, last_name, email, phone, city, state')
        .eq('audience_id', audienceId)
        .limit(5);
      
      if (error) throw error;
      return recipients;
    },
    enabled: enabled && !!audienceId,
  });
}
