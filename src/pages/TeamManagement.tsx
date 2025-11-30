import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { roleDisplayNames, roleColors } from '@/lib/auth/roleUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { UserActionMenu } from "@/components/settings/UserActionMenu";
import { formatDistanceToNow } from "date-fns";
import { Users, Mail } from "lucide-react";
import type { ClientUser } from "@/types/users';

export default function TeamManagement() {
  const { data: userRole } = useUserRole();

  // Fetch team members based on user's role
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userRole) return [];

      if (userRole === "agency_owner") {
        // Get agency owner's organizations
        const { data: userOrgs } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id);

        if (!userOrgs || userOrgs.length === 0) return [];

        const orgIds = userOrgs.map((o) => o.org_id);

        // Get all users in those organizations (separate queries to avoid join issues)
        const { data: orgMembers } = await supabase
          .from("org_members")
          .select("user_id, org_id, organizations(id, name)")
          .in("org_id", orgIds);

        if (!orgMembers) return [];

        // Get profiles for those users
        const userIds = [...new Set(orgMembers.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .in("id", userIds);

        if (!profiles) return [];

        // Get roles for users
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        // Get clients for users
        const { data: clientUsers } = await supabase
          .from("client_users")
          .select("user_id, client_id, clients(id, name)")
          .in("user_id", userIds);

        // Combine all data
        return profiles.map((profile) => {
          const profileRoles = roles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || [];
          const profileOrgs = orgMembers
            .filter(om => om.user_id === profile.id)
            .map(om => om.organizations)
            .filter(Boolean);
          const profileClients = clientUsers
            ?.filter(cu => cu.user_id === profile.id)
            .map(cu => cu.clients)
            .filter(Boolean) || [];

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            created_at: profile.created_at,
            roles: profileRoles,
            organizations: profileOrgs as Array<{ id: string; name: string }>,
            clients: profileClients as Array<{ id: string; name: string }>,
          };
        });
      }

      if (userRole === "company_owner") {
        // Get company owner's clients
        const { data: userClients } = await supabase
          .from("client_users")
          .select<"client_id", ClientUser>("client_id")
          .eq("user_id", user.id);

        if (!userClients || userClients.length === 0) return [];

        const clientIds = userClients.map((c) => c.client_id);

        // Get all users assigned to those clients
        const { data: clientUsers } = await supabase
          .from("client_users")
          .select("user_id, client_id, clients(id, name)")
          .in("client_id", clientIds);

        if (!clientUsers) return [];

        // Get profiles for those users
        const userIds = [...new Set(clientUsers.map(cu => cu.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, created_at")
          .in("id", userIds);

        if (!profiles) return [];

        // Get roles for users
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        // Get orgs for users
        const { data: orgMembers } = await supabase
          .from("org_members")
          .select("user_id, org_id, organizations(id, name)")
          .in("user_id", userIds);

        // Combine all data
        return profiles.map((profile) => {
          const profileRoles = roles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || [];
          const profileOrgs = orgMembers
            ?.filter(om => om.user_id === profile.id)
            .map(om => om.organizations)
            .filter(Boolean) || [];
          const profileClients = clientUsers
            .filter(cu => cu.user_id === profile.id)
            .map(cu => cu.clients)
            .filter(Boolean);

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            created_at: profile.created_at,
            roles: profileRoles,
            organizations: profileOrgs as Array<{ id: string; name: string }>,
            clients: profileClients as Array<{ id: string; name: string }>,
          };
        });
      }

      return [];
    },
    enabled: !!userRole,
  });

  // Fetch pending invitations - typed explicitly to avoid deep type inference
  const pendingInvitesQuery = useQuery({
    queryKey: ["teamInvitations"],
    queryFn: async (): Promise<any[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const result: any = await (supabase
        .from("user_invitations") as any)
        .select("id, email, role, created_at, expires_at, invited_by_user_id, status")
        .eq("invited_by_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (result.error) throw result.error;
      return result.data || [];
    },
  });
  
  const pendingInvites = pendingInvitesQuery.data || [];

  if (userRole !== "agency_owner" && userRole !== "company_owner") {
    return (
      <Layout>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            Team management is only available for Agency Owners and Company Owners.
          </p>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
            <p className="text-muted-foreground">
              Manage your team members and invitations
            </p>
          </div>
          <InviteUserDialog />
        </div>

        {/* Active Team Members */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {teamMembers.length} Active Member{teamMembers.length !== 1 ? "s" : ""}
          </h2>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading team...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members yet. Invite someone to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => {
                const memberRole = member.roles[0]?.role;
                return (
                  <div
                    key={member.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{member.full_name || member.email}</h3>
                        {memberRole && (
                          <Badge className={roleColors[memberRole as keyof typeof roleColors]}>
                            {roleDisplayNames[memberRole as keyof typeof roleDisplayNames]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>

                      <div className="flex flex-wrap gap-4 text-sm pt-2">
                        {member.clients.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Clients: </span>
                            <span>{member.clients.map((c) => c.name).join(", ")}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Active: </span>
                          <span>
                            {formatDistanceToNow(new Date(member.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <UserActionMenu user={member} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              {pendingInvites.length} Pending Invitation{pendingInvites.length !== 1 ? "s" : ""}
            </h2>

            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {invite.role && roleDisplayNames[invite.role as keyof typeof roleDisplayNames]} •
                        Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })} •
                        Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm">
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <InviteUserDialog />
    </Layout>
  );
}
