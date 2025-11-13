import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  BarChart3, 
  Code2, 
  Settings,
  Zap,
  Building,
  FileStack
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: ('org_admin' | 'agency_admin' | 'client_user')[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Mail },
  { name: "Audiences", href: "/audiences", icon: Users },
  { name: "Templates", href: "/templates", icon: FileStack },
  { name: "Lead Marketplace", href: "/marketplace", icon: Zap },
  { name: "API & Webhooks", href: "/api", icon: Code2, roles: ['org_admin', 'agency_admin'] },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { hasRole } = useAuth();
  const { clients, currentClient, setCurrentClient, currentOrg } = useTenant();
  
  const visibleNavigation = navigation.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => hasRole(role));
  });

  // Filter clients by current org for agency admins
  const availableClients = currentOrg 
    ? clients.filter(c => c.org_id === currentOrg.id)
    : clients;
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">ACE Engage</h1>
            <p className="text-xs text-sidebar-foreground/60">Direct Mail Engine</p>
          </div>
        </div>

        {/* Client Selector - for agency admins with multiple clients */}
        {(hasRole('agency_admin') || hasRole('org_admin')) && availableClients.length > 0 && (
          <div className="border-b border-sidebar-border px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-sidebar-foreground/60" />
              <span className="text-xs font-medium text-sidebar-foreground/60">Current Client</span>
            </div>
            <Select
              value={currentClient?.id || ''}
              onValueChange={(value) => {
                const client = availableClients.find(c => c.id === value);
                if (client) setCurrentClient(client);
              }}
            >
              <SelectTrigger className="w-full h-9 bg-sidebar-accent/50 text-sidebar-foreground">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground/70">
                        ({client.industry})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

      </div>
    </aside>
  );
}
