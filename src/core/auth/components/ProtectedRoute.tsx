import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@core/auth/AuthProvider';
import { Permission } from '@/core/auth/permissionRegistry';
import { AppRole } from '@/core/auth/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Single required permission (preferred approach) */
  permission?: Permission;
  /** Multiple required permissions — user needs ANY of them */
  permissions?: Permission[];
  /** Multiple required permissions — user needs ALL of them */
  allPermissions?: Permission[];
  /** @deprecated Use `permission` instead. Legacy role-based check. */
  requiredRole?: AppRole;
  /** @deprecated Use `permissions` instead. Legacy role-based check. */
  requiredRoles?: AppRole[];
  /** @deprecated Use `permissions` instead. */
  requiredPermission?: string;
  /** @deprecated Use `permissions` instead. */
  requiredPermissions?: string[];
  /** @deprecated Use `allPermissions` instead. */
  requireAllPermissions?: boolean;
}

export function ProtectedRoute({ 
  children,
  permission,
  permissions,
  allPermissions,
  // Legacy props — keep for backward compat during migration
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiredPermissions,
  requireAllPermissions = false 
}: ProtectedRouteProps) {
  const { user, loading, hasRole, hasPermission, hasAnyPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── New typed permission checks ──────────────────────────────────────
  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }

  if (permissions && !hasAnyPermission(permissions)) {
    return <AccessDenied />;
  }

  if (allPermissions && !allPermissions.every(p => hasPermission(p))) {
    return <AccessDenied />;
  }

  // ── Legacy checks (backward compat — remove these after full migration) ──
  if (requiredRole && !hasRole(requiredRole)) {
    return <AccessDenied />;
  }

  if (requiredRoles && !requiredRoles.some(role => hasRole(role))) {
    return <AccessDenied />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AccessDenied />;
  }

  if (requiredPermissions) {
    const hasAccess = requireAllPermissions
      ? requiredPermissions.every(p => hasPermission(p))
      : hasAnyPermission(requiredPermissions);
    if (!hasAccess) return <AccessDenied />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
