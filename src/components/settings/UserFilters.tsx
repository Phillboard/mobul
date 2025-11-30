import { AppRole } from "@/lib/auth/roleUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

interface UserFiltersProps {
  roleFilter: AppRole | null;
  onRoleFilterChange: (role: AppRole | null) => void;
  orgFilter: string | null;
  onOrgFilterChange: (orgId: string | null) => void;
  clientFilter: string | null;
  onClientFilterChange: (clientId: string | null) => void;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
}

export function UserFilters({
  roleFilter,
  onRoleFilterChange,
  orgFilter,
  onOrgFilterChange,
  clientFilter,
  onClientFilterChange,
  showInactive,
  onShowInactiveChange,
}: UserFiltersProps) {
  // Fetch organizations
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const roles: { value: AppRole; label: string }[] = [
    { value: "admin", label: "Admin" },
    { value: "tech_support", label: "Tech Support" },
    { value: "agency_owner", label: "Agency Owner" },
    { value: "company_owner", label: "Company Owner" },
    { value: "developer", label: "Developer" },
    { value: "call_center", label: "Call Center" },
  ];

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Label>Role</Label>
        <Select
          value={roleFilter || "all"}
          onValueChange={(value) =>
            onRoleFilterChange(value === "all" ? null : (value as AppRole))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label>Organization</Label>
        <Select
          value={orgFilter || "all"}
          onValueChange={(value) =>
            onOrgFilterChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label>Client</Label>
        <Select
          value={clientFilter || "all"}
          onValueChange={(value) =>
            onClientFilterChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={onShowInactiveChange}
        />
        <Label htmlFor="show-inactive" className="cursor-pointer">
          Show inactive
        </Label>
      </div>
    </div>
  );
}
