import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Shield, Building2, Users, UserX } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { AssignOrganizationDialog } from "./AssignOrganizationDialog";
import { AssignClientDialog } from "./AssignClientDialog";
import { AppRole } from "@/lib/roleUtils";

interface UserActionMenuProps {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    roles: Array<{ role: string }>;
    organizations: Array<{ id: string; name: string }>;
    clients: Array<{ id: string; name: string }>;
  };
}

export function UserActionMenu({ user }: UserActionMenuProps) {
  const { data: currentUserRole } = useUserRole();
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [assignOrgOpen, setAssignOrgOpen] = useState(false);
  const [assignClientOpen, setAssignClientOpen] = useState(false);

  const userRole = user.roles[0]?.role as AppRole;
  const canChangeRole = currentUserRole === 'admin' || currentUserRole === 'tech_support';
  const canAssignOrg = currentUserRole === 'admin';
  const canAssignClient = currentUserRole === 'admin' || currentUserRole === 'agency_owner';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canChangeRole && (
            <DropdownMenuItem onClick={() => setChangeRoleOpen(true)}>
              <Shield className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>
          )}
          {canAssignOrg && (
            <DropdownMenuItem onClick={() => setAssignOrgOpen(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Manage Organizations
            </DropdownMenuItem>
          )}
          {canAssignClient && (
            <DropdownMenuItem onClick={() => setAssignClientOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Manage Clients
            </DropdownMenuItem>
          )}
          {canChangeRole && (
            <DropdownMenuItem className="text-destructive">
              <UserX className="h-4 w-4 mr-2" />
              Deactivate User
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangeRoleDialog
        open={changeRoleOpen}
        onOpenChange={setChangeRoleOpen}
        userId={user.id}
        currentRole={userRole}
        userName={user.full_name || user.email}
      />

      <AssignOrganizationDialog
        open={assignOrgOpen}
        onOpenChange={setAssignOrgOpen}
        userId={user.id}
        userName={user.full_name || user.email}
        currentOrgs={user.organizations}
      />

      <AssignClientDialog
        open={assignClientOpen}
        onOpenChange={setAssignClientOpen}
        userId={user.id}
        userName={user.full_name || user.email}
        currentClients={user.clients}
      />
    </>
  );
}
