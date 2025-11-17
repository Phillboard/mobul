import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'tech_support' | 'agency_owner' | 'company_owner' | 'developer' | 'call_center';
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  requiredPermissions,
  requireAllPermissions = false 
}: ProtectedRouteProps) {
  const { user, loading, hasRole, hasPermission, hasAnyPermission, permissions } = useAuth();
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

  if (!user) {
    return null;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have the required role to view this page.</p>
        </div>
      </div>
    );
  }

  // Check single permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Check multiple permissions requirement
  if (requiredPermissions) {
    const hasAccess = requireAllPermissions
      ? requiredPermissions.every(p => hasPermission(p))
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have the required permissions to view this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
