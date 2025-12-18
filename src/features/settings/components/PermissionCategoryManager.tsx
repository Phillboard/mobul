import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, Lock, Shield } from "lucide-react";

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface PermissionCategoryManagerProps {
  userId: string;
  permissions: Permission[];
  userPermissions: string[];
  rolePermissions: string[];
}

const CATEGORY_ICONS: Record<string, any> = {
  dashboard: "📊",
  campaigns: "📧",
  templates: "🎨",
  audiences: "👥",
  giftcards: "🎁",
  calls: "📞",
  settings: "⚙️",
  users: "👤",
  clients: "🏢",
  organizations: "🏛️",
  leads: "🎯",
  analytics: "📈",
  platform: "🔐",
};

export function PermissionCategoryManager({
  userId,
  permissions,
  userPermissions,
  rolePermissions,
}: PermissionCategoryManagerProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["campaigns"]));
  const queryClient = useQueryClient();

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const toggleCategory = (module: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  const grantMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("user_permissions")
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-permission-overrides"] });
      toast.success("Permission granted");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("user_permissions")
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted: false,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-permission-overrides"] });
      toast.success("Permission revoked");
    },
  });

  const isChecked = (permName: string) => userPermissions.includes(permName);
  const isFromRole = (permName: string) => 
    rolePermissions.includes(permName) && !userPermissions.includes(permName);

  return (
    <div className="space-y-2">
      {Object.entries(permissionsByModule).map(([module, perms]) => {
        const checkedCount = perms.filter(p => isChecked(p.name)).length;
        const totalCount = perms.length;
        
        return (
          <Collapsible
            key={module}
            open={openCategories.has(module)}
            onOpenChange={() => toggleCategory(module)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{CATEGORY_ICONS[module] || "📋"}</span>
                  <span className="font-medium capitalize">{module}</span>
                  {checkedCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {checkedCount}/{totalCount}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    openCategories.has(module) ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="px-4 py-2 space-y-2">
              {perms.map((perm) => {
                const checked = isChecked(perm.name);
                const fromRole = isFromRole(perm.name);
                
                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={checked || fromRole}
                        onCheckedChange={(isChecked) => {
                          if (isChecked) {
                            grantMutation.mutate(perm.id);
                          } else {
                            revokeMutation.mutate(perm.id);
                          }
                        }}
                        disabled={fromRole}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {perm.name.split('.')[1]}
                          </span>
                          {fromRole && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Shield className="h-3 w-3" />
                              From Role
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {perm.description}
                        </p>
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
  );
}
