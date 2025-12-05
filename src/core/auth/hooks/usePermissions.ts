import { useAuth } from '@core/auth/AuthProvider';

/**
 * Hook to easily check permissions in components
 * 
 * @example
 * const { canView, canCreate, canEdit, canDelete } = usePermissions('campaigns');
 * 
 * if (canCreate) {
 *   return <Button>Create Campaign</Button>
 * }
 */
export function usePermissions(module: string) {
  const { hasPermission } = useAuth();

  return {
    canView: hasPermission(`${module}.view`),
    canCreate: hasPermission(`${module}.create`),
    canEdit: hasPermission(`${module}.edit`),
    canDelete: hasPermission(`${module}.delete`),
    canManage: hasPermission(`${module}.manage`),
    canApprove: hasPermission(`${module}.approve`),
    canExport: hasPermission(`${module}.export`),
    canImport: hasPermission(`${module}.import`),
  };
}

/**
 * Check a specific permission
 * @param permission Full permission string (e.g., 'campaigns.create')
 */
export function usePermission(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
