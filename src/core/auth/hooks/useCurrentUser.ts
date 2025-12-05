/**
 * useCurrentUser Hook
 * 
 * Fetches current authenticated user with profile and role information.
 * Provides centralized user data access across the application.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

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

      // Get user roles (user may have multiple roles)
      const { data: rolesData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError) {
        console.error("Error fetching user roles:", roleError);
      }

      // Role hierarchy - return highest privilege role
      const roleHierarchy: Record<string, number> = {
        admin: 1,
        tech_support: 2,
        agency_owner: 3,
        company_owner: 4,
        developer: 5,
        call_center: 6
      };

      let highestRole = "user";
      if (rolesData && rolesData.length > 0) {
        const sortedRoles = rolesData
          .map(r => r.role)
          .sort((a, b) => (roleHierarchy[a] || 999) - (roleHierarchy[b] || 999));
        highestRole = sortedRoles[0];
      }

      const currentUser: CurrentUser = {
        id: user.id,
        email: user.email || "",
        role: highestRole,
      };

      return currentUser;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
