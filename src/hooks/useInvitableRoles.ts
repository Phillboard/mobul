import { useUserRole } from "./useUserRole";
import { AppRole, roleDisplayNames } from "@/lib/roleUtils";
import { roleRequirements } from "@/lib/roleRequirements";

export interface InvitableRole {
  value: AppRole;
  label: string;
  description: string;
  requiresOrg: boolean;
  requiresClient: boolean;
}

export function useInvitableRoles() {
  const { data: userRole } = useUserRole();

  const invitableRoles: InvitableRole[] = [];

  if (!userRole) {
    return { invitableRoles, isLoading: true };
  }

  const userRoleConfig = roleRequirements[userRole as AppRole];
  
  if (!userRoleConfig) {
    return { invitableRoles, isLoading: false };
  }

  // Get roles this user can invite
  userRoleConfig.canInvite.forEach((role) => {
    const roleConfig = roleRequirements[role];
    invitableRoles.push({
      value: role,
      label: roleDisplayNames[role],
      description: roleConfig.description,
      requiresOrg: roleConfig.requiresOrg,
      requiresClient: roleConfig.requiresClient,
    });
  });

  return { invitableRoles, isLoading: false };
}
