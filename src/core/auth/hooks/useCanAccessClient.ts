/**
 * useCanAccessClient Hook
 * 
 * Checks if current user has access to a specific client.
 * Used for authorization and data access control.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

/**
 * Hook to check if user can access a specific client
 * 
 * @param clientId - Client ID to check access for
 * @returns Query result with boolean access permission
 */
export function useCanAccessClient(clientId: string | undefined | null) {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: ["canAccessClient", clientId],
    queryFn: async () => {
      if (!clientId) return false;

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return false;
      }

      // Admins can access all clients
      if (userRole === 'admin') {
        return true;
      }

      // Check if user is assigned to this client
      const { data, error } = await supabase
        .from("client_users")
        .select("id")
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found = no access
          return false;
        }
        console.error("Error checking client access:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!clientId && !!userRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to get list of client IDs user has access to
 * 
 * @returns Query result with array of client IDs
 */
export function useAccessibleClients() {
  const { data: userRole } = useUserRole();

  return useQuery({
    queryKey: ["accessibleClients"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return [];
      }

      // Admins can access all clients
      if (userRole === 'admin') {
        const { data, error } = await supabase
          .from("clients")
          .select("id");

        if (error) {
          console.error("Error fetching all clients:", error);
          return [];
        }

        return data.map(c => c.id);
      }

      // Get clients assigned to user
      const { data, error } = await supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching accessible clients:", error);
        return [];
      }

      return data.map(cu => cu.client_id);
    },
    enabled: !!userRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}
