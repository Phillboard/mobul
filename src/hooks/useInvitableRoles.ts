import { useUserRole } from "./useUserRole";
import { AppRole, roleDisplayNames } from '@/lib/auth/roleUtils';
import { roleRequirements } from '@/lib/auth/roleRequirements";

export interface InvitableRole {
  value: AppRole;
  label: string;
  description: string;
  requiresOrg: boolean;
  requiresClient: boolean;
}

export function useInvitableRoles() {
  const { data: userRole, isLoading } = useUserRole();

  const invitableRoles: InvitableRole[] = [];

  if (isLoading) {
    return { invitableRoles, isLoading: true };
  }

  if (!userRole) {
    console.warn("useInvitableRoles: User has no role assigned");
    return { invitableRoles, isLoading: false };
  }

  const userRoleConfig = roleRequirements[userRole];
  
  if (!userRoleConfig) {
    console.error("useInvitableRoles: Invalid role configuration for', userRole);
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
