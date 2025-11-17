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
  const { organizations, clients, currentOrg, setCurrentOrg, isAdminMode, currentClient, setCurrentClient, setAdminMode } = useTenant();

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
        <div className="flex-1 flex items-center gap-3">
          {/* Admin Mode Toggle */}
          {hasRole('admin') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isAdminMode ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Shield className="h-4 w-4" />
                  {isAdminMode ? "Admin View" : "Platform"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
                <DropdownMenuItem onClick={() => setAdminMode(true)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAdminMode(false)}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Client View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Organization Selector */}
          {organizations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  {currentOrg?.name || "Select Agency"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-50 max-h-96 overflow-y-auto">
                {organizations.map((org) => (
                  <DropdownMenuItem 
                    key={org.id} 
                    onClick={() => setCurrentOrg(org)}
                    className={currentOrg?.id === org.id ? "bg-accent font-medium" : ""}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    {org.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Client Selector */}
          {clients.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  {currentClient?.name || "Select Client"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-50 max-h-96 overflow-y-auto">
                {organizations.map((org) => {
                  const orgClients = clients.filter(c => c.org_id === org.id);
                  if (orgClients.length === 0) return null;
                  return (
                    <div key={org.id}>
                      <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {org.name}
                      </DropdownMenuLabel>
                      {orgClients.map((client) => (
                        <DropdownMenuItem 
                          key={client.id} 
                          onClick={() => {
                            setCurrentClient(client);
                            if (hasRole('admin')) setAdminMode(false);
                          }}
                          className={currentClient?.id === client.id ? "bg-accent font-medium" : "pl-6"}
                        >
                          <Briefcase className="mr-2 h-3.5 w-3.5 opacity-60" />
                          {client.name}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
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
