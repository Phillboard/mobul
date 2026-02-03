import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import { ChevronDown, Building2, Shield, Plus, Minus, Info } from "lucide-react";
import { PERMISSION_CATEGORIES } from "@/core/auth/permissionRegistry";
import { AppRole, roleDisplayNames } from "@/core/auth/roles";
import { ROLE_PERMISSION_MATRIX } from "@/core/auth/rolePermissionMatrix";

interface Agency {
  id: string;
  name: string;
}

interface OrgOverride {
  id: string;
  agency_id: string;
  role: string;
  permission_name: string;
  granted: boolean;
  notes: string | null;
}

interface PermissionRecord {
  id: string;
  name: string;
  description: string;
  module: string;
  category: string | null;
}

const MANAGEABLE_ROLES: AppRole[] = ['agency_owner', 'company_owner', 'developer', 'call_center'];

export function OrgPermissionOverrideManager() {
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Agency[];
    },
  });

  // Fetch all permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("id, name, description, module, category")
        .order("name");
      if (error) throw error;
      return data as PermissionRecord[];
    },
  });

  // Fetch org overrides for selected agency
  const { data: orgOverrides = [] } = useQuery({
    queryKey: ["org-permission-overrides", selectedAgency],
    queryFn: async () => {
      if (!selectedAgency) return [];
      const { data, error } = await supabase
        .from("org_permission_overrides")
        .select("*")
        .eq("agency_id", selectedAgency);
      if (error) throw error;
      return data as OrgOverride[];
    },
    enabled: !!selectedAgency,
  });

  // Get role defaults from the code matrix
  const roleDefaults = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return new Set(ROLE_PERMISSION_MATRIX[selectedRole] || []);
  }, [selectedRole]);

  // Get overrides for the selected role
  const roleOverrides = useMemo(() => {
    if (!selectedRole) return new Map<string, OrgOverride>();
    const map = new Map<string, OrgOverride>();
    orgOverrides
      .filter(o => o.role === selectedRole)
      .forEach(o => map.set(o.permission_name, o));
    return map;
  }, [orgOverrides, selectedRole]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, PermissionRecord[]> = {};
    permissions.forEach(p => {
      const category = p.category || p.module || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(p);
    });
    return grouped;
  }, [permissions]);

  // Mutation to create/update override
  const upsertOverrideMutation = useMutation({
    mutationFn: async ({ 
      permissionName, 
      granted, 
      notes 
    }: { 
      permissionName: string; 
      granted: boolean; 
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("org_permission_overrides")
        .upsert({
          agency_id: selectedAgency,
          role: selectedRole,
          permission_name: permissionName,
          granted,
          notes: notes || null,
        }, {
          onConflict: 'agency_id,role,permission_name'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-permission-overrides", selectedAgency] });
      toast.success("Permission override saved");
    },
    onError: (error) => {
      toast.error("Failed to save override: " + (error as Error).message);
    },
  });

  // Mutation to delete override (restore to role default)
  const deleteOverrideMutation = useMutation({
    mutationFn: async (permissionName: string) => {
      const { error } = await supabase
        .from("org_permission_overrides")
        .delete()
        .eq("agency_id", selectedAgency)
        .eq("role", selectedRole)
        .eq("permission_name", permissionName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-permission-overrides", selectedAgency] });
      toast.success("Override removed, restored to role default");
    },
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getPermissionState = (permName: string): {
    isGranted: boolean;
    source: 'role_default' | 'org_granted' | 'org_revoked';
    override?: OrgOverride;
  } => {
    const override = roleOverrides.get(permName);
    const isRoleDefault = roleDefaults.has(permName);

    if (override) {
      return {
        isGranted: override.granted,
        source: override.granted ? 'org_granted' : 'org_revoked',
        override,
      };
    }

    return {
      isGranted: isRoleDefault,
      source: 'role_default',
    };
  };

  const handlePermissionToggle = (permName: string, currentState: ReturnType<typeof getPermissionState>) => {
    const isRoleDefault = roleDefaults.has(permName);
    const newGranted = !currentState.isGranted;

    // If toggling back to role default, delete the override
    if ((isRoleDefault && newGranted) || (!isRoleDefault && !newGranted)) {
      if (currentState.override) {
        deleteOverrideMutation.mutate(permName);
      }
      return;
    }

    // Otherwise, create/update the override
    upsertOverrideMutation.mutate({
      permissionName: permName,
      granted: newGranted,
      notes: noteInput[permName],
    });
  };

  const selectedAgencyName = agencies.find(a => a.id === selectedAgency)?.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Permission Overrides
        </CardTitle>
        <CardDescription>
          Customize what each role can do within a specific agency. 
          Changes here override the platform defaults for all users with that role in this agency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agency and Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Agency</label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agency..." />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select 
              value={selectedRole} 
              onValueChange={(v) => setSelectedRole(v as AppRole)}
              disabled={!selectedAgency}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {MANAGEABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleDisplayNames[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info Banner */}
        {selectedAgency && selectedRole && (
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">
                Showing permissions for {roleDisplayNames[selectedRole]} at {selectedAgencyName}
              </p>
              <p className="text-muted-foreground mt-1">
                Checked permissions are granted. Unchecked are denied. 
                Changes override the platform defaults for this agency only.
              </p>
            </div>
          </div>
        )}

        {/* Permission Categories */}
        {selectedAgency && selectedRole && (
          <div className="space-y-2">
            {Object.entries(permissionsByCategory).map(([category, perms]) => {
              const stats = perms.reduce(
                (acc, p) => {
                  const state = getPermissionState(p.name);
                  if (state.isGranted) acc.granted++;
                  if (state.source !== 'role_default') acc.overridden++;
                  return acc;
                },
                { granted: 0, overridden: 0 }
              );

              return (
                <Collapsible
                  key={category}
                  open={openCategories.has(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{category}</span>
                        <Badge variant="secondary">
                          {stats.granted}/{perms.length}
                        </Badge>
                        {stats.overridden > 0 && (
                          <Badge variant="outline" className="text-orange-600">
                            {stats.overridden} overridden
                          </Badge>
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openCategories.has(category) ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-4 py-2 space-y-2">
                    {perms.map((perm) => {
                      const state = getPermissionState(perm.name);
                      const isRoleDefault = roleDefaults.has(perm.name);

                      return (
                        <div
                          key={perm.id}
                          className={`flex items-start justify-between py-3 px-3 rounded-md transition-all ${
                            state.source !== 'role_default' 
                              ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800' 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              checked={state.isGranted}
                              onCheckedChange={() => handlePermissionToggle(perm.name, state)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {perm.name}
                                </span>
                                {state.source === 'role_default' && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Shield className="h-3 w-3" />
                                    Role Default
                                  </Badge>
                                )}
                                {state.source === 'org_granted' && (
                                  <Badge className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    <Plus className="h-3 w-3" />
                                    Org Granted
                                  </Badge>
                                )}
                                {state.source === 'org_revoked' && (
                                  <Badge className="text-xs gap-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                                    <Minus className="h-3 w-3" />
                                    Org Revoked
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                              {state.override?.notes && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                  Note: {state.override.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {(!selectedAgency || !selectedRole) && (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an agency and role to manage permission overrides</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
