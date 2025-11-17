import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Shield, Building2, Briefcase, Check, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export function AdminContextSwitcher() {
  const { hasRole } = useAuth();
  const { 
    isAdminMode, 
    setAdminMode, 
    organizations, 
    clients, 
    currentClient,
    setCurrentClient,
    setCurrentOrg 
  } = useTenant();
  
  // Track which agencies are expanded - auto-expand all by default
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    new Set(organizations.map(org => org.id))
  );

  // Only show for admins
  if (!hasRole('admin')) return null;

  const toggleOrgExpanded = (orgId: string) => {
    const newExpanded = new Set(expandedOrgIds);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgIds(newExpanded);
  };

  const handleAdminView = () => {
    setAdminMode(true);
    setCurrentClient(null);
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setCurrentClient(client);
      setAdminMode(false);
      const org = organizations.find(o => o.id === client.org_id);
      if (org) setCurrentOrg(org);
    }
  };

  const getIndustryColor = (industry: string) => {
    const colors: Record<string, string> = {
      roofing_services: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      dental: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      fitness_gym: "bg-green-500/10 text-green-600 border-green-500/20",
      realtor_listing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      financial_advisor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      auto_service: "bg-red-500/10 text-red-600 border-red-500/20",
      auto_warranty: "bg-slate-500/10 text-slate-600 border-slate-500/20",
      healthcare_checkup: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      restaurant_promo: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      home_services: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      default: "bg-muted text-muted-foreground border-border"
    };
    return colors[industry] || colors.default;
  };

  return (
    <div className="p-4 border-b border-border bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-between ${
              isAdminMode 
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:from-amber-500/20 hover:to-orange-500/20' 
                : 'bg-background'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isAdminMode ? (
                <>
                  <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="font-semibold truncate">Admin View</span>
                </>
              ) : currentClient ? (
                <>
                  <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">{currentClient.name}</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-muted-foreground">Select Context</span>
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
            Platform Context
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleAdminView} className="cursor-pointer">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <span className="font-semibold">Admin View</span>
              </div>
              {isAdminMode && <Check className="h-4 w-4 text-primary" />}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase flex items-center justify-between">
            <span>Agencies & Clients</span>
            <Badge variant="secondary" className="text-xs">{clients.length}</Badge>
          </DropdownMenuLabel>

          <ScrollArea className="h-[300px]">
            {organizations.map((org) => {
              const orgClients = clients.filter(c => c.org_id === org.id);
              const isExpanded = expandedOrgIds.has(org.id);

              return (
                <div key={org.id} className="py-0.5">
                  {/* Agency Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleOrgExpanded(org.id)}
                    className="w-full px-2 py-1.5 text-xs font-semibold text-foreground flex items-center gap-1.5 hover:bg-muted/50 transition-colors rounded-sm"
                  >
                    <ChevronRight 
                      className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">{org.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {orgClients.length}
                    </Badge>
                  </button>

                  {/* Clients under this agency */}
                  {isExpanded && orgClients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => handleClientSelect(client.id)}
                      className="cursor-pointer pl-8 py-1.5"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate text-sm">{client.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 ${getIndustryColor(client.industry)}`}
                          >
                            {client.industry.replace(/_/g, ' ')}
                          </Badge>
                          {currentClient?.id === client.id && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              );
            })}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAdminMode && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
          <Shield className="h-3 w-3" />
          <span className="font-medium">Platform-wide access active</span>
        </div>
      )}
    </div>
  );
}
