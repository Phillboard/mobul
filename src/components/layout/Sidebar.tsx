import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { AdminContextSwitcher } from "./AdminContextSwitcher";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  BarChart3, 
  Code2, 
  Settings,
  Zap,
  Building,
  FileStack,
  Gift,
  UserCog,
  Globe,
  ShoppingCart
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
  permissions?: string[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, permissions: ['dashboard.view'] },
  { name: "Campaigns", href: "/campaigns", icon: Mail, permissions: ['campaigns.view'] },
  { name: "Audiences", href: "/audiences", icon: Users, permissions: ['audiences.view'] },
  { name: "Templates", href: "/templates", icon: FileStack, permissions: ['templates.view'] },
  { name: "Lead Marketplace", href: "/marketplace", icon: Zap, permissions: ['lead_marketplace.view'] },
  { name: "Purchase Gift Cards", href: "/purchase-gift-cards", icon: ShoppingCart, permissions: ['gift_cards.purchase'] },
  { name: "Gift Cards", href: "/gift-cards", icon: Gift, permissions: ['gift_cards.view'] },
  { name: "Landing Pages", href: "/landing-pages", icon: Globe, permissions: ['landingpages.view'] },
  { name: "API & Webhooks", href: "/api", icon: Code2, permissions: ['api.view'] },
  { name: "User Management", href: "/users", icon: UserCog, permissions: ['users.view'] },
  { name: "Settings", href: "/settings", icon: Settings, permissions: ['settings.view'] },
];

export function Sidebar() {
  const { hasRole, hasAnyPermission } = useAuth();
  const { clients, currentClient, setCurrentClient, currentOrg } = useTenant();
  
  const visibleNavigation = navigation.filter(item => {
    // Check role-based access (legacy support)
    if (item.roles && !item.roles.some(role => hasRole(role))) {
      return false;
    }
    // Check permission-based access
    if (item.permissions && !hasAnyPermission(item.permissions)) {
      return false;
    }
    return true;
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

        {/* Platform Admin Context Switcher */}
        {hasRole('platform_admin') && <AdminContextSwitcher />}

        {/* Client Selector - for agency/org admins (but not platform admins who use AdminContextSwitcher) */}
        {!hasRole('platform_admin') && (hasRole('agency_admin') || hasRole('org_admin')) && availableClients.length > 0 && (
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
