import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
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
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
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

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <SidebarComponent collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-16 items-center gap-2 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow-sm">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-sidebar-foreground truncate">ACE Engage</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">Direct Mail Engine</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild tooltip={item.name} isActive={active}>
                      <NavLink
                        to={item.href}
                        end={item.href === '/'}
                        className="flex items-center gap-3 w-full"
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {state === "expanded" && <span>{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarComponent>
  );
}
