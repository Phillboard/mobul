import { Button } from "@/components/ui/button";
import { Bell, HelpCircle, LogOut, User, Building2, ChevronDown, Shield, Briefcase, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ImpersonateUserDialog } from "@/components/admin/ImpersonateUserDialog";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

export function Header() {
  const { profile, roles, signOut, hasRole } = useAuth();
  const { organizations, currentOrg, setCurrentOrg, isAdminMode, currentClient } = useTenant();

  const getRoleLabel = () => {
    if (roles.some(r => r.role === 'admin')) return 'Admin';
    if (roles.some(r => r.role === 'tech_support')) return 'Tech Support';
    if (roles.some(r => r.role === 'agency_owner')) return 'Agency Owner';
    if (roles.some(r => r.role === 'company_owner')) return 'Company Owner';
    if (roles.some(r => r.role === 'developer')) return 'Developer';
    if (roles.some(r => r.role === 'call_center')) return 'Call Center';
    return 'User';
  };

  const getInitials = () => {
    if (!profile?.full_name) return profile?.email?.charAt(0).toUpperCase() || 'U';
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <ImpersonationBanner />
      <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-border bg-card">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex-1 flex items-center gap-4">
          {/* Admin Mode Badge */}
          {hasRole('admin') && isAdminMode && (
            <Badge variant="secondary" className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}

          {/* Current Client Badge */}
          {!isAdminMode && currentClient && (
            <Badge variant="outline" className="gap-1.5">
              <Briefcase className="h-3 w-3" />
              {currentClient.name}
            </Badge>
          )}

          {/* Organization Switcher - for users with multiple orgs (not platform admins in admin mode) */}
          {!isAdminMode && organizations.length > 1 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select
                value={currentOrg?.id || ''}
                onValueChange={(value) => {
                  const org = organizations.find(o => o.id === value);
                  if (org) setCurrentOrg(org);
                }}
              >
                <SelectTrigger className="w-[200px] h-9 bg-background">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Impersonation Tool */}
          {hasRole('admin') && (
            <ImpersonateUserDialog 
              trigger={
                <Button variant="ghost" size="icon" title="Impersonate User">
                  <Users className="h-5 w-5" />
                </Button>
              }
            />
          )}

          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  <Badge variant="secondary" className="w-fit mt-1">
                    {getRoleLabel()}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </header>
    </>
  );
}
