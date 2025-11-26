/**
 * useUserRole Hook
 * 
 * Lightweight hook to check user's role without fetching full user data.
 * Useful for authorization checks and conditional rendering.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/roleUtils";

/**
 * Hook to get current user's role
 * 
 * @returns Query result with role string
 */
export function useUserRole() {
  return useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return null;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No role found
          return null;
        }
        throw error;
      }

      return data.role as AppRole;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to check if user has specific role
 * 
 * @param requiredRole - Role to check for
 * @returns Query result with boolean
 */
export function useHasRole(requiredRole: AppRole) {
  const { data: userRole, ...rest } = useUserRole();
  
  return {
    ...rest,
    data: userRole === requiredRole,
    hasRole: userRole === requiredRole,
  };
}

/**
 * Hook to check if user has any of the specified roles
 * 
 * @param allowedRoles - Array of allowed roles
 * @returns Query result with boolean
 */
export function useHasAnyRole(allowedRoles: AppRole[]) {
  const { data: userRole, ...rest } = useUserRole();
  
  return {
    ...rest,
    data: userRole ? allowedRoles.includes(userRole) : false,
    hasAnyRole: userRole ? allowedRoles.includes(userRole) : false,
  };
}
