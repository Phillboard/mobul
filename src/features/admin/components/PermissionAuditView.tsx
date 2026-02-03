import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { 
  Shield, 
  Building2, 
  User, 
  Check, 
  X, 
  Download,
  Search,
  Filter
} from "lucide-react";
import { useState } from "react";
import { PERMISSION_CATEGORIES } from "@/core/auth/permissionRegistry";

interface PermissionAuditViewProps {
  userId: string;
  userEmail?: string;
  userRole?: string;
  agencyName?: string;
}

interface DetailedPermission {
  permission_name: string;
  source: string;
  is_granted: boolean;
  role_default: boolean;
  org_override: boolean;
  user_override: boolean;
}

const SOURCE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  'role_default': { 
    label: 'Role Default', 
    variant: 'secondary',
    icon: <Shield className="h-3 w-3" />
  },
  'org_override': { 
    label: 'Org Override', 
    variant: 'default',
    icon: <Building2 className="h-3 w-3" />
  },
  'user_override': { 
    label: 'User Override', 
    variant: 'outline',
    icon: <User className="h-3 w-3" />
  },
  'org_revoked': { 
    label: 'Org Revoked', 
    variant: 'destructive',
    icon: <Building2 className="h-3 w-3" />
  },
  'user_revoked': { 
    label: 'User Revoked', 
    variant: 'destructive',
    icon: <User className="h-3 w-3" />
  },
  'not_granted': { 
    label: 'Not Granted', 
    variant: 'outline',
    icon: <X className="h-3 w-3" />
  },
};

export function PermissionAuditView({ 
  userId, 
  userEmail,
  userRole,
  agencyName 
}: PermissionAuditViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterGranted, setFilterGranted] = useState<boolean | null>(null);

  // Fetch detailed permissions using the RPC
  const { data: permissions = [], isLoading, error } = useQuery({
    queryKey: ["user-permissions-detailed", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_permissions_detailed', { _user_id: userId });
      
      if (error) throw error;
      return data as DetailedPermission[];
    },
    enabled: !!userId,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = permissions.length;
    const granted = permissions.filter(p => p.is_granted).length;
    const roleDefault = permissions.filter(p => p.source === 'role_default' && p.is_granted).length;
    const orgOverride = permissions.filter(p => p.org_override).length;
    const userOverride = permissions.filter(p => p.user_override).length;
    
    return { total, granted, roleDefault, orgOverride, userOverride };
  }, [permissions]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      // Search filter
      if (searchQuery && !p.permission_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Source filter
      if (filterSource && p.source !== filterSource) {
        return false;
      }
      // Granted filter
      if (filterGranted !== null && p.is_granted !== filterGranted) {
        return false;
      }
      return true;
    });
  }, [permissions, searchQuery, filterSource, filterGranted]);

  // Group by category for display
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, DetailedPermission[]> = {};
    
    // Find category for each permission
    filteredPermissions.forEach(p => {
      let category = 'Other';
      for (const [cat, perms] of Object.entries(PERMISSION_CATEGORIES)) {
        if ((perms as readonly string[]).includes(p.permission_name)) {
          category = cat;
          break;
        }
      }
      if (!groups[category]) groups[category] = [];
      groups[category].push(p);
    });

    return groups;
  }, [filteredPermissions]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Permission', 'Granted', 'Source', 'Role Default', 'Org Override', 'User Override'];
    const rows = permissions.map(p => [
      p.permission_name,
      p.is_granted ? 'Yes' : 'No',
      p.source,
      p.role_default ? 'Yes' : 'No',
      p.org_override ? 'Yes' : 'No',
      p.user_override ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-${userEmail || userId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load permissions: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Audit
            </CardTitle>
            <CardDescription className="mt-1">
              {userEmail && <span className="font-medium">{userEmail}</span>}
              {userRole && (
                <Badge variant="secondary" className="ml-2">
                  {userRole}
                </Badge>
              )}
              {agencyName && (
                <span className="text-muted-foreground ml-2">
                  @ {agencyName}
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats.granted}</div>
            <div className="text-xs text-muted-foreground">of {stats.total} granted</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.roleDefault}</div>
            <div className="text-xs text-muted-foreground">Role Defaults</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.orgOverride}</div>
            <div className="text-xs text-muted-foreground">Org Overrides</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.userOverride}</div>
            <div className="text-xs text-muted-foreground">User Overrides</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats.total - stats.granted}
            </div>
            <div className="text-xs text-muted-foreground">Denied</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterGranted === true ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterGranted(filterGranted === true ? null : true)}
            >
              <Check className="h-4 w-4 mr-1" />
              Granted
            </Button>
            <Button
              variant={filterGranted === false ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterGranted(filterGranted === false ? null : false)}
            >
              <X className="h-4 w-4 mr-1" />
              Denied
            </Button>
          </div>
        </div>

        {/* Permission Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading permissions...
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Permission</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[150px]">Source</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-center">Org</TableHead>
                  <TableHead className="text-center">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <>
                    <TableRow key={`cat-${category}`} className="bg-muted/30">
                      <TableCell colSpan={6} className="font-semibold py-2">
                        {category} ({perms.length})
                      </TableCell>
                    </TableRow>
                    {perms.map((p) => {
                      const sourceBadge = SOURCE_BADGES[p.source] || SOURCE_BADGES['not_granted'];
                      return (
                        <TableRow key={p.permission_name}>
                          <TableCell className="font-mono text-sm">
                            {p.permission_name}
                          </TableCell>
                          <TableCell className="text-center">
                            {p.is_granted ? (
                              <Check className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sourceBadge.variant} className="gap-1">
                              {sourceBadge.icon}
                              {sourceBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {p.role_default ? (
                              <Check className="h-4 w-4 text-muted-foreground mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {p.org_override ? (
                              <Badge variant="outline" className="text-xs">
                                {p.is_granted && p.source === 'org_override' ? '+' : '-'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {p.user_override ? (
                              <Badge variant="outline" className="text-xs">
                                {p.is_granted && p.source === 'user_override' ? '+' : '-'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPermissions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No permissions match your filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}
