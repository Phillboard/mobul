import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { PendingInvitations } from "@/components/settings/PendingInvitations";
import { UserActionMenu } from "@/components/settings/UserActionMenu";
import { roleDisplayNames, roleColors } from "@/lib/roleUtils";
import { useManageableUsers } from "@/hooks/useManageableUsers";
import { formatDistanceToNow } from "date-fns";
import { UserCog } from "lucide-react";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useManageableUsers();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCog className="h-8 w-8" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage users, roles, and permissions across the platform
            </p>
          </div>
          <InviteUserDialog />
        </div>

        <PendingInvitations />

        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const userRole = user.roles[0]?.role;
                return (
                  <div
                    key={user.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{user.full_name || user.email}</h3>
                        {userRole && (
                          <Badge className={roleColors[userRole as keyof typeof roleColors]}>
                            {roleDisplayNames[userRole as keyof typeof roleDisplayNames]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm pt-2">
                        {user.organizations.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Organization: </span>
                            <span>{user.organizations.map(o => o.name).join(", ")}</span>
                          </div>
                        )}
                        {user.clients.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Clients: </span>
                            <span>{user.clients.map(c => c.name).join(", ")}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Joined: </span>
                          <span>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    <UserActionMenu user={user} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
