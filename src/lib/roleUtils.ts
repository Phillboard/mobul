export type AppRole = 'admin' | 'tech_support' | 'agency_owner' | 'company_owner' | 'developer' | 'call_center';

export const roleDisplayNames: Record<AppRole, string> = {
  admin: 'Admin',
  tech_support: 'Tech Support',
  agency_owner: 'Agency Owner',
  company_owner: 'Company Owner',
  developer: 'Developer',
  call_center: 'Call Center Employee'
};

export const roleDescriptions: Record<AppRole, string> = {
  admin: 'Full platform access',
  tech_support: 'Support and troubleshooting',
  agency_owner: 'Manage agencies and create companies',
  company_owner: 'Manage company campaigns and data',
  developer: 'Technical development access',
  call_center: 'Gift card redemption only'
};

export const roleHierarchy: Record<AppRole, number> = {
  admin: 1,
  tech_support: 2,
  agency_owner: 3,
  company_owner: 4,
  developer: 5,
  call_center: 6
};

export const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-500',
  tech_support: 'bg-blue-500',
  agency_owner: 'bg-purple-500',
  company_owner: 'bg-green-500',
  developer: 'bg-orange-500',
  call_center: 'bg-gray-500'
};

export function getRoleLevel(role: AppRole): number {
  return roleHierarchy[role];
}

export function canManageRole(userRole: AppRole, targetRole: AppRole): boolean {
  return getRoleLevel(userRole) < getRoleLevel(targetRole);
}
