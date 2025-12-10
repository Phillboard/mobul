import { AppRole } from "./roleUtils";

export interface RoleRequirement {
  role: AppRole;
  requiresOrg: boolean;
  requiresClient: boolean;
  canInvite: AppRole[];
  description: string;
}

export const roleRequirements: Record<AppRole, RoleRequirement> = {
  admin: {
    role: "admin",
    requiresOrg: false,
    requiresClient: false,
    canInvite: ["admin", "tech_support", "agency_owner", "company_owner", "developer", "call_center"],
    description: "Full platform access",
  },
  tech_support: {
    role: "tech_support",
    requiresOrg: false,
    requiresClient: false,
    canInvite: ["agency_owner", "company_owner", "developer", "call_center"],
    description: "Support and troubleshooting",
  },
  agency_owner: {
    role: "agency_owner",
    requiresOrg: true,
    requiresClient: false,
    canInvite: ["company_owner", "call_center"],
    description: "Manage agencies and create companies",
  },
  company_owner: {
    role: "company_owner",
    requiresOrg: false,
    requiresClient: true,
    canInvite: ["call_center"],
    description: "Manage company campaigns and data",
  },
  developer: {
    role: "developer",
    requiresOrg: false,
    requiresClient: false,
    canInvite: [],
    description: "Technical development access",
  },
  call_center: {
    role: "call_center",
    requiresOrg: false,
    requiresClient: true,
    canInvite: [],
    description: "Gift card redemption only",
  },
};

export function getRoleRequirement(role: AppRole): RoleRequirement {
  return roleRequirements[role];
}

export function canInviteRole(inviterRole: AppRole, targetRole: AppRole): boolean {
  return roleRequirements[inviterRole].canInvite.includes(targetRole);
}
