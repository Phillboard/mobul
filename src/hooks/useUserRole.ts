/**
 * useUserRole Hook
 * 
 * Lightweight hook to check user's role without fetching full user data.
 * Useful for authorization checks and conditional rendering.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, roleHierarchy } from "@/lib/auth/roleUtils";

/**
 * Hook to get all roles for current user
 * 
 * @returns Query result with array of roles
 */
export function useUserRoles() {
  return useQuery({
    queryKey: ["userRoles"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return [];
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
          console.error("Error fetching user roles:", error);
        return [];
      }

      return (data || []).map(r => r.role as AppRole);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to get current user's highest privilege role
 * If user has multiple roles, returns the one with highest privilege (lowest hierarchy number)
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
        .eq("user_id", user.id);

      if (error) {
        if (error.code === 'PGRST116') {
          // No roles found
          return null;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // If user has multiple roles, return the one with highest privilege (lowest hierarchy number)
      const roles = data.map(r => r.role as AppRole);
      const highestPrivilegeRole = roles.sort((a, b) => roleHierarchy[a] - roleHierarchy[b])[0];
      
      return highestPrivilegeRole;
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
