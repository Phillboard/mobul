/**
 * useCurrentUser Hook
 * 
 * Fetches current authenticated user with profile and role information.
 * Provides centralized user data access across the application.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Hook to get current user with role and profile
 * 
 * @returns Query result with user data
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("Not authenticated");
      }

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error("Error fetching user role:", roleError);
      }

      const currentUser: CurrentUser = {
        id: user.id,
        email: user.email || "",
        role: roleData?.role || "user",
      };

      return currentUser;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
