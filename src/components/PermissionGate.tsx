import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function PermissionGate({ 
  children, 
  permission,
  permissions,
  requireAll = false,
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission } = useAuth();

  // Single permission check
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Multiple permissions check
  if (permissions) {
    if (requireAll) {
      // User must have ALL specified permissions
      const hasAll = permissions.every(p => hasPermission(p));
      if (!hasAll) return <>{fallback}</>;
    } else {
      // User must have at least ONE permission
      if (!hasAnyPermission(permissions)) return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
