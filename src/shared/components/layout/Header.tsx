import { Button } from "@/shared/components/ui/button";
import { Bell, HelpCircle, LogOut, User, Building2, ChevronDown, Shield, Briefcase, Users, Check } from "lucide-react";
import { useAuth } from "@core/auth/AuthProvider";
import { useTenant } from "@/contexts/TenantContext";
import { useState, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { ImpersonateUserDialog } from "@/features/admin/components/ImpersonateUserDialog";
import { ImpersonationBanner } from "@/features/admin/components/ImpersonationBanner";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { profile, roles, signOut, hasRole } = useAuth();
  const { organizations, clients, currentOrg, setCurrentOrg, isAdminMode, currentClient, setCurrentClient, setAdminMode } = useTenant();
  const [clientSearch, setClientSearch] = useState("");

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

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clients, clientSearch]);

  // Group clients by organization with counts
  const clientsByOrg = useMemo(() => {
    return organizations.map(org => ({
      org,
      clients: filteredClients.filter(c => c.org_id === org.id),
      count: clients.filter(c => c.org_id === org.id).length
    })).filter(item => item.clients.length > 0);
  }, [organizations, filteredClients, clients]);

  return (
    <>
      <ImpersonationBanner />
      <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-border/30 bg-card/80 backdrop-blur-2xl shadow-sm">
      <div className="flex h-full items-center justify-between px-2 md:px-6 gap-1 md:gap-4">
        <div className="flex-1 flex items-center gap-1 md:gap-3 min-w-0">
          {/* Sidebar Toggle */}
          <SidebarTrigger className="-ml-1 h-10 w-10 md:h-9 md:w-9" />
          
          {/* Admin Mode Toggle */}
          {hasRole('admin') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={isAdminMode ? "default" : "outline"} 
                  size="sm" 
                  className={`gap-1 md:gap-2 h-10 px-2 md:px-3 ${isAdminMode ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20' : ''}`}
                >
                  <Shield className={`h-4 w-4 ${isAdminMode ? 'text-amber-500' : ''}`} />
                  <span className="hidden sm:inline">{isAdminMode ? "Admin View" : "Client View"}</span>
                  <ChevronDown className="h-3 w-3 hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover z-50">
                <DropdownMenuItem 
                  onClick={() => setAdminMode(true)}
                  className={isAdminMode ? "bg-accent" : ""}
                >
                  {isAdminMode && <Check className="mr-2 h-4 w-4" />}
                  <Shield className={`${isAdminMode ? '' : 'mr-2'} h-4 w-4`} />
                  Admin View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setAdminMode(false)}
                  className={!isAdminMode ? "bg-accent" : ""}
                >
                  {!isAdminMode && <Check className="mr-2 h-4 w-4" />}
                  <Briefcase className={`${!isAdminMode ? '' : 'mr-2'} h-4 w-4`} />
                  Client View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Organization Selector */}
          {!isAdminMode && organizations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`gap-1 md:gap-2 h-10 md:h-9 px-2 md:px-3 ${currentOrg ? 'border-primary/50' : ''}`}
                >
                  <Building2 className={`h-4 w-4 shrink-0 ${currentOrg ? 'text-primary' : ''}`} />
                  <span className="hidden lg:inline font-medium truncate">{currentOrg?.name || "Select Agency"}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-50 max-h-96 overflow-y-auto">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Select Agency ({organizations.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => {
                  const orgClientCount = clients.filter(c => c.org_id === org.id).length;
                  return (
                    <DropdownMenuItem 
                      key={org.id} 
                      onClick={() => setCurrentOrg(org)}
                      className={currentOrg?.id === org.id ? "bg-accent font-medium" : ""}
                    >
                      {currentOrg?.id === org.id && <Check className="mr-2 h-4 w-4 text-primary" />}
                      <Building2 className={`${currentOrg?.id === org.id ? '' : 'mr-2'} h-4 w-4`} />
                      <div className="flex-1">
                        {org.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({orgClientCount} {orgClientCount === 1 ? 'client' : 'clients'})
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Client Selector */}
          {!isAdminMode && clients.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`gap-1 md:gap-2 min-w-0 max-w-[120px] sm:max-w-[200px] md:max-w-xs justify-start h-10 md:h-9 px-2 md:px-3 ${currentClient ? 'border-primary/50' : ''}`}
                >
                  <Briefcase className={`h-4 w-4 shrink-0 ${currentClient ? 'text-primary' : ''}`} />
                  <span className="truncate text-xs sm:text-sm font-medium">{currentClient?.name || "Select Client"}</span>
                  {currentClient && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs hidden md:inline-flex">
                      {currentClient.industry.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 shrink-0 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 bg-popover z-50 max-h-96 overflow-y-auto">
                <div className="p-2 sticky top-0 bg-popover">
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="h-8"
                  />
                </div>
                <DropdownMenuSeparator />
                {clientsByOrg.map(({ org, clients: orgClients, count }) => (
                  <div key={org.id}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      {org.name} ({count})
                    </DropdownMenuLabel>
                    {orgClients.map((client) => (
                      <DropdownMenuItem 
                        key={client.id} 
                        onClick={() => {
                          setCurrentClient(client);
                          if (hasRole('admin')) setAdminMode(false);
                          setClientSearch("");
                        }}
                        className={currentClient?.id === client.id ? "bg-accent font-medium" : "pl-6"}
                      >
                        {currentClient?.id === client.id && <Check className="mr-2 h-4 w-4 text-primary" />}
                        <Briefcase className={`${currentClient?.id === client.id ? '' : 'mr-2'} h-3.5 w-3.5 opacity-60`} />
                        <div className="flex-1">
                          {client.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            {client.industry.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No clients found
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Admin Impersonation Tool */}
          {hasRole('admin') && (
            <ImpersonateUserDialog 
              trigger={
                <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9" title="Impersonate User">
                  <Users className="h-5 w-5" />
                </Button>
              }
            />
          )}

          <Button variant="ghost" size="icon" className="hidden lg:flex h-9 w-9">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 rounded-full p-0">
                <Avatar className="h-9 w-9 md:h-10 md:w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
