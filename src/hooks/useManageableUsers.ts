import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export interface ManageableUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: Array<{ role: string }>;
  organizations: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
}

/**
 * Hook to fetch users that the current user can manage based on their role and scope
 */
export function useManageableUsers() {
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  return useQuery({
    queryKey: ["manageableUsers", userRole],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userRole) return [];

      // Admin and tech_support can see all users
      if (userRole === 'admin' || userRole === 'tech_support') {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name,
            created_at,
            user_roles!inner(role),
            org_members(
              organizations(id, name)
            ),
            client_users(
              clients(id, name)
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return formatUsers(data);
      }

      // Agency owners can see users in their organizations and their clients
      if (userRole === 'agency_owner') {
        // Get user's organizations
        const { data: userOrgs } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id);

        if (!userOrgs || userOrgs.length === 0) return [];

        const orgIds = userOrgs.map(o => o.org_id);

        // Get users in those orgs
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name,
            created_at,
            user_roles!inner(role),
            org_members!inner(
              organizations(id, name)
            ),
            client_users(
              clients(id, name)
            )
          `)
          .in("org_members.org_id", orgIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return formatUsers(data);
      }

      // Company owners can see users in their client
      if (userRole === 'company_owner') {
        const { data: userClients } = await supabase
          .from("client_users")
          .select("client_id")
          .eq("user_id", user.id);

        if (!userClients || userClients.length === 0) return [];

        const clientIds = userClients.map(c => c.client_id);

        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name,
            created_at,
            user_roles!inner(role),
            org_members(
              organizations(id, name)
            ),
            client_users!inner(
              clients(id, name)
            )
          `)
          .in("client_users.client_id", clientIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return formatUsers(data);
      }

      // Others can only see themselves
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          created_at,
          user_roles!inner(role),
          org_members(
            organizations(id, name)
          ),
          client_users(
            clients(id, name)
          )
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return [formatUser(data)];
    },
    enabled: !roleLoading && !!userRole,
  });
}

function formatUsers(data: any[]): ManageableUser[] {
  return data.map(formatUser);
}

function formatUser(user: any): ManageableUser {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    created_at: user.created_at,
    roles: user.user_roles || [],
    organizations: user.org_members?.map((om: any) => om.organizations).filter(Boolean) || [],
    clients: user.client_users?.map((cu: any) => cu.clients).filter(Boolean) || [],
  };
}
