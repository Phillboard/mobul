import { useMemo } from "react";
import { useAuth } from "@core/auth/AuthProvider";
import { useTenant } from "@/contexts/TenantContext";
import { settingsTabs, TabConfig } from '@/lib/config/settingsConfig';

export function useSettingsTabs() {
  const { roles, hasAnyPermission } = useAuth();
  const { currentClient, currentOrg } = useTenant();

  return useMemo(() => {
    return settingsTabs.filter(tab => {
      // If roles is 'all', everyone can see this tab
      if (tab.roles === 'all') {
        return true;
      }

      // Check role requirement
      if (tab.roles && Array.isArray(tab.roles)) {
        const hasRequiredRole = tab.roles.some(requiredRole => 
          roles.some(userRole => userRole.role === requiredRole)
        );
        if (!hasRequiredRole) return false;
      }

      // Check permission requirement (OR logic - need at least one)
      if (tab.permissions && tab.permissions.length > 0) {
        if (!hasAnyPermission(tab.permissions)) return false;
      }

      // Check client requirement
      if (tab.requiresClient && !currentClient) return false;

      // Check org requirement
      if (tab.requiresOrg && !currentOrg) return false;

      return true;
    });
  }, [roles, currentClient, currentOrg, hasAnyPermission]);
}
