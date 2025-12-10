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
        // First get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            full_name,
            created_at
          `)
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;
        if (!profiles) return [];

        // Get user roles for all profiles
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", profiles.map(p => p.id));

        if (rolesError) throw rolesError;

        // Get org memberships
        const { data: orgMembers, error: orgError } = await supabase
          .from("org_members")
          .select("user_id, organizations(id, name)")
          .in("user_id", profiles.map(p => p.id));

        if (orgError) throw orgError;

        // Get client memberships
        const { data: clientUsers, error: clientError } = await supabase
          .from("client_users")
          .select("user_id, clients(id, name)")
          .in("user_id", profiles.map(p => p.id));

        if (clientError) throw clientError;

        // Combine the data
        return profiles.map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          roles: userRoles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || [],
          organizations: orgMembers?.filter(om => om.user_id === profile.id).map(om => om.organizations).filter(Boolean) || [],
          clients: clientUsers?.filter(cu => cu.user_id === profile.id).map(cu => cu.clients).filter(Boolean) || [],
        }));
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
        const { data: orgMemberships, error: orgMembersError } = await supabase
          .from("org_members")
          .select("user_id, organizations(id, name)")
          .in("org_id", orgIds);

        if (orgMembersError) throw orgMembersError;
        if (!orgMemberships) return [];

        const userIds = [...new Set(orgMemberships.map(om => om.user_id))];

        // Get profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .in("id", userIds)
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;
        if (!profiles) return [];

        // Get user roles
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        // Get client memberships
        const { data: clientUsers } = await supabase
          .from("client_users")
          .select("user_id, clients(id, name)")
          .in("user_id", userIds);

        // Combine the data
        return profiles.map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          roles: userRoles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || [],
          organizations: orgMemberships?.filter(om => om.user_id === profile.id).map(om => om.organizations).filter(Boolean) || [],
          clients: clientUsers?.filter(cu => cu.user_id === profile.id).map(cu => cu.clients).filter(Boolean) || [],
        }));
      }

      // Company owners can see users in their client
      if (userRole === 'company_owner') {
        const { data: userClients } = await supabase
          .from("client_users")
          .select("client_id")
          .eq("user_id", user.id);

        if (!userClients || userClients.length === 0) return [];

        const clientIds = userClients.map(c => c.client_id);

        // Get users in those clients
        const { data: clientMemberships, error: clientMembersError } = await supabase
          .from("client_users")
          .select("user_id, clients(id, name)")
          .in("client_id", clientIds);

        if (clientMembersError) throw clientMembersError;
        if (!clientMemberships) return [];

        const userIds = [...new Set(clientMemberships.map(cm => cm.user_id))];

        // Get profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .in("id", userIds)
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;
        if (!profiles) return [];

        // Get user roles
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        // Get org memberships
        const { data: orgMembers } = await supabase
          .from("org_members")
          .select("user_id, organizations(id, name)")
          .in("user_id", userIds);

        // Combine the data
        return profiles.map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          roles: userRoles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || [],
          organizations: orgMembers?.filter(om => om.user_id === profile.id).map(om => om.organizations).filter(Boolean) || [],
          clients: clientMemberships?.filter(cm => cm.user_id === profile.id).map(cm => cm.clients).filter(Boolean) || [],
        }));
      }

      // Others can only see themselves
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) return [];

      // Get user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("user_id", user.id);

      // Get org memberships
      const { data: orgMembers } = await supabase
        .from("org_members")
        .select("user_id, organizations(id, name)")
        .eq("user_id", user.id);

      // Get client memberships
      const { data: clientUsers } = await supabase
        .from("client_users")
        .select("user_id, clients(id, name)")
        .eq("user_id", user.id);

      return [{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        roles: userRoles?.map(r => ({ role: r.role })) || [],
        organizations: orgMembers?.map(om => om.organizations).filter(Boolean) || [],
        clients: clientUsers?.map(cu => cu.clients).filter(Boolean) || [],
      }];
    },
    enabled: !roleLoading && !!userRole,
  });
}
