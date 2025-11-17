import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  Code2, 
  Settings,
  Zap,
  FileStack,
  Gift,
  UserCog,
  Globe,
  ShoppingCart,
  Building2,
  Contact,
  TrendingUp,
  Activity,
  CheckSquare,
} from "lucide-react";

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
  { name: "Contacts", href: "/contacts", icon: Contact, permissions: ['audiences.view'] },
  { name: "Companies", href: "/companies", icon: Building2, permissions: ['audiences.view'] },
  { name: "Deals", href: "/deals", icon: TrendingUp, permissions: ['audiences.view'] },
  { name: "Activities", href: "/activities", icon: Activity, permissions: ['audiences.view'] },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, permissions: ['audiences.view'] },
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
  
  const visibleNavigation = navigation.filter(item => {
    // Check role-based access
    if (item.roles && !item.roles.some(role => hasRole(role as any))) {
      return false;
    }
    // Check permission-based access
    if (item.permissions && !hasAnyPermission(item.permissions)) {
      return false;
    }
    return true;
  });

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

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
