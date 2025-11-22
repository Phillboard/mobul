import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  Code2, 
  Settings as SettingsIcon,
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
  Workflow,
  Package,
  ChevronDown,
  ArrowLeft,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSettingsTabs } from "@/hooks/useSettingsTabs";
import { settingsTabs, settingsGroups } from "@/lib/settingsConfig";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permissions?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permissions?: string[];
  collapsible?: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, permissions: ['dashboard.view'] },
      { name: "Campaigns", href: "/campaigns", icon: Mail, permissions: ['campaigns.view'] },
      { name: "Templates", href: "/templates", icon: FileStack, permissions: ['templates.view'] },
      { name: "Landing Pages", href: "/landing-pages", icon: Globe, permissions: ['landingpages.view'] },
      { name: "Audience Manager", href: "/audiences", icon: Users, permissions: ['audiences.view'] },
      { name: "Purchase Cards", href: "/purchase-gift-cards", icon: Package, permissions: ['gift_cards.purchase'] },
    ]
  },
  {
    label: "CRM",
    collapsible: true,
    items: [
      { name: "Contacts", href: "/contacts", icon: Contact, permissions: ['audiences.view'] },
      { name: "Companies", href: "/companies", icon: Building2, permissions: ['audiences.view'] },
      { name: "Deals", href: "/deals", icon: TrendingUp, permissions: ['audiences.view'] },
      { name: "Activities", href: "/activities", icon: Activity, permissions: ['audiences.view'] },
      { name: "Tasks", href: "/tasks", icon: CheckSquare, permissions: ['audiences.view'] },
    ]
  },
  {
    label: "Rewards",
    items: [
      { name: "Gift Card Manager", href: "/gift-cards", icon: Gift, permissions: ['gift_cards.purchase'] },
      { name: "Lead Marketplace", href: "/marketplace", icon: ShoppingCart, permissions: ['lead_marketplace.view'] },
    ]
  },
  {
    label: "Platform Admin",
    collapsible: true,
    permissions: ['admin'],
    items: [
      { name: "Gift Card Marketplace", href: "/admin/gift-card-marketplace", icon: Package, permissions: ['admin'] },
    ]
  },
  {
    label: "Administration",
    collapsible: true,
    permissions: ['settings.view', 'users.view', 'api.view'],
    items: [
      { name: "API & Integrations", href: "/api", icon: Code2, permissions: ['api.view'] },
      { name: "Automation", href: "/zapier-templates", icon: Workflow, permissions: ['settings.integrations'] },
      { name: "User Management", href: "/users", icon: UserCog, permissions: ['users.view'] },
      { name: "Settings", href: "/settings/account", icon: SettingsIcon, permissions: ['settings.view'] },
    ]
  },
];

export function Sidebar() {
  const { hasAnyPermission, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { state } = useSidebar();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const visibleTabs = useSettingsTabs();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Check if we're on a settings page
  const isOnSettingsPage = pathname.startsWith('/settings');

  // Filter groups and items by permissions
  const visibleGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.permissions) return true;
        // Check if any permission is a role (admin, agency_owner, etc.)
        const hasRequiredRole = item.permissions.some(p => 
          ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'].includes(p) && 
          hasRole(p as any)
        );
        // Check if any permission is a regular permission
        const hasRequiredPermission = hasAnyPermission(item.permissions);
        return hasRequiredRole || hasRequiredPermission;
      })
    }))
    .filter(group => {
      // Show group if user has any of the group permissions (if specified)
      if (group.permissions) {
        const hasRequiredRole = group.permissions.some(p => 
          ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer', 'call_center'].includes(p) && 
          hasRole(p as any)
        );
        const hasRequiredPermission = hasAnyPermission(group.permissions);
        if (!hasRequiredRole && !hasRequiredPermission) {
          return false;
        }
      }
      // Show group if it has any visible items
      return group.items.length > 0;
    });

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  // Render settings-specific sidebar
  if (isOnSettingsPage) {
    return (
      <SidebarComponent collapsible="icon" className="border-r border-border/20 bg-card/40 dark:bg-card/95 backdrop-blur-xl">
        <SidebarHeader className="border-b border-border/20 dark:border-border/30">
          <div className="flex h-16 items-center gap-2 px-3">
            {state === "expanded" ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="h-9 w-9 shrink-0 rounded-[--radius] hover:bg-primary/10 hover:text-primary transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">Settings</h1>
                  <p className="text-xs text-muted-foreground truncate">Account & Preferences</p>
                </div>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-9 w-9 rounded-[--radius] hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          {settingsGroups.map((group) => {
            const groupTabs = visibleTabs.filter(tab => 
              settingsTabs.find(t => t.id === tab.id)?.group === group.id
            );

            if (groupTabs.length === 0) return null;

            return (
              <SidebarGroup key={group.id}>
                <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-2"}>
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupTabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = pathname === `/settings/${tab.id}`;
                      
                      return (
                        <SidebarMenuItem key={tab.id}>
                          <SidebarMenuButton 
                            asChild 
                            tooltip={tab.label} 
                            isActive={active}
                            className="rounded-[--radius] h-11 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-accent/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:shadow-sm data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all duration-200"
                          >
                            <NavLink
                              to={`/settings/${tab.id}`}
                              className="flex items-center gap-3 w-full"
                            >
                              <Icon className="h-5 w-5 flex-shrink-0" />
                              {state === "expanded" && <span>{tab.label}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </SidebarComponent>
    );
  }

  // Render regular sidebar
  return (
    <SidebarComponent collapsible="icon" className="border-r border-border/20 bg-card/40 dark:bg-card/95 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/20 dark:border-border/30">
        <div className="flex h-16 items-center gap-2 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[--radius] bg-gradient-to-br from-primary to-accent shadow-glow-sm hover:shadow-glow-md transition-all duration-300 animate-glow-pulse">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">ACE Engage</h1>
              <p className="text-xs text-muted-foreground truncate">Direct Mail Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {visibleGroups.map((group) => {
          if (group.collapsible) {
            // Collapsible flyout group
            const hasActiveItem = group.items.some(item => isActive(item.href));
            const isOpen = openGroups[group.label] || hasActiveItem;
            
            return (
              <Collapsible
                key={group.label}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.label)}
                className="group/collapsible"
              >
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-primary/10 hover:text-primary rounded-[--radius] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 transition-all duration-200">
                      {state === "expanded" ? (
                        <>
                          <span>{group.label}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </>
                      ) : (
                        <span className="sr-only">{group.label}</span>
                      )}
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent className="transition-all duration-300">
                    <SidebarGroupContent>
                      <SidebarMenuSub>
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          
                          return (
                            <SidebarMenuSubItem key={item.name}>
                              <SidebarMenuSubButton 
                                asChild 
                                isActive={active}
                                className="rounded-[--radius] h-10 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-accent/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:shadow-sm data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all duration-200"
                              >
                                <NavLink
                                  to={item.href}
                                  end={item.href === '/'}
                                  className="flex items-center gap-3 w-full"
                                >
                                  <Icon className="h-4 w-4 flex-shrink-0" />
                                  {state === "expanded" && <span className="text-sm">{item.name}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            );
          }
          
          // Regular non-collapsible group
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-2"}>
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton 
                          asChild 
                          tooltip={item.name} 
                          isActive={active}
                          className="rounded-[--radius] h-11 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-accent/10 data-[active=true]:text-primary data-[active=true]:font-medium data-[active=true]:shadow-sm data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all duration-200"
                        >
                          <NavLink
                            to={item.href}
                            end={item.href === '/'}
                            className="flex items-center gap-3 w-full"
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {state === "expanded" && <span>{item.name}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </SidebarComponent>
  );
}
