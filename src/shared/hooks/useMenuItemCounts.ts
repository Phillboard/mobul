import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useAuth } from "@core/auth/AuthProvider";

export interface MenuItemCounts {
  mailedCampaigns: number;
  draftCampaigns: number;
}

export function useMenuItemCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['menu-counts', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          mailedCampaigns: 0,
          draftCampaigns: 0,
        };
      }

      // Fetch all counts in parallel
      const [mailedCampaigns, draftCampaigns] = await Promise.all([
        // Mailed campaigns count
        supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'mailed')
          .then(({ count }) => count || 0),

        // Draft campaigns count
        supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft')
          .then(({ count }) => count || 0),
      ]);

      return {
        mailedCampaigns,
        draftCampaigns,
      };
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refresh every 2 minutes
    enabled: !!user,
  });
}
