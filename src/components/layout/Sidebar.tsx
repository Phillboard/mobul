import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Mail, FileText, Users, Building2, Gift, Headphones, Phone,
  BarChart3, Code, Settings as SettingsIcon, ShoppingCart, Globe, Handshake,
  Activity, ListTodo, Workflow, ChevronRight, ArrowLeft, FormInput, AlertTriangle,
  Gauge, Bug, HelpCircle, BookOpen
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { settingsTabs } from "@/lib/settingsConfig";
import { useSettingsTabs } from "@/hooks/useSettingsTabs";
import { useMenuSearch, SearchableNavItem } from "@/hooks/useMenuSearch";
import { AppRole } from "@/lib/roleUtils";
import { Button } from "@/components/ui/button";
import {
  Sidebar as SidebarRoot, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarSearch } from "./SidebarSearch";
import { Badge } from "@/components/ui/badge";
import { useMenuItemCounts } from "@/hooks/useMenuItemCounts";

interface NavItem extends SearchableNavItem {
  roles?: AppRole[];
  permissions?: string[];
  count?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  roles?: AppRole[];
  permissions?: string[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, permissions: ['dashboard.view'], keywords: ["home", "overview"], description: "Main dashboard" },
    ]
  },
  {
    label: "Marketing",
    collapsible: true,
    items: [
      { name: "Campaigns", href: "/campaigns", icon: Mail, permissions: ['campaigns.view'], keywords: ["mail", "postcards"], description: "Manage campaigns" },
      { name: "DirectMail", href: "/templates", icon: FileText, permissions: ['templates.view'], keywords: ["design", "layouts", "templates"], description: "Direct mail templates" },
      { name: "Ace Forms", href: "/ace-forms", icon: FormInput, permissions: ['campaigns.view'], keywords: ["forms", "gift card", "redemption"], description: "AI form builder" },
      { name: "Webinar", href: "/webinar", icon: Users, permissions: ['campaigns.view'], keywords: ["events", "online", "meetings"], description: "Manage webinars" },
      { name: "Landing Pages", href: "/landing-pages", icon: Globe, permissions: ['landingpages.view'], keywords: ["web", "purl"], description: "Manage landing pages" },
    ]
  },
  { 
    label: "CRM", 
    collapsible: true, 
    items: [
      { name: "Contacts", href: "/contacts", icon: Users, permissions: ['audiences.view', 'contacts.view'], keywords: ["people", "audiences", "lists"], description: "Manage contacts and audiences" },
      { name: "Companies", href: "/companies", icon: Building2, permissions: ['audiences.view', 'companies.view'], keywords: ["businesses"], description: "Manage companies" },
      { name: "Deals", href: "/deals", icon: Handshake, permissions: ['audiences.view', 'deals.view'], keywords: ["sales"], description: "Track deals" },
      { name: "Activities", href: "/activities", icon: Activity, permissions: ['audiences.view', 'activities.view'], keywords: ["timeline"], description: "Activity timeline" },
      { name: "Tasks", href: "/tasks", icon: ListTodo, permissions: ['audiences.view', 'tasks.view'], keywords: ["todos"], description: "Manage tasks" },
    ]
  },
  { 
    label: "Gift Cards", 
    collapsible: true,
    items: [
      { name: "Manage Cards", href: "/gift-cards", icon: Gift, permissions: ['gift_cards.manage', 'giftcards.view'], keywords: ["rewards", "inventory"], description: "Manage gift card inventory" },
      { name: "Purchase Cards", href: "/purchase-gift-cards", icon: ShoppingCart, permissions: ['gift_cards.purchase', 'giftcards.purchase'], keywords: ["buy"], description: "Purchase gift cards" },
      { name: "Marketplace", href: "/admin/gift-card-marketplace", icon: Gift, roles: ['admin'], permissions: ['giftcards.admin_view'], keywords: ["admin", "master"], description: "Admin marketplace" },
    ]
  },
  { 
    label: "Call Center", 
    collapsible: true, 
    roles: ['call_center', 'admin'], 
    items: [
      { name: "Redeem Cards", href: "/call-center/redeem", icon: Gift, roles: ['call_center', 'admin'], permissions: ['calls.confirm_redemption'], keywords: ["redemption", "provision"], description: "Redeem gift cards" },
      { name: "Agent Dashboard", href: "/agent-dashboard", icon: Headphones, roles: ['call_center', 'admin'], permissions: ['calls.agent_dashboard', 'calls.confirm_redemption'], keywords: ["calls"], description: "Handle calls" },
      { name: "Call Analytics", href: "/call-center", icon: Phone, roles: ['call_center', 'admin'], permissions: ['calls.view', 'calls.manage'], keywords: ["reports"], description: "Call metrics" },
    ]
  },
  { 
    label: "Administration", 
    collapsible: true, 
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3, permissions: ['analytics.view'], keywords: ["reports", "metrics"], description: "View analytics" },
      { name: "Performance", href: "/performance", icon: Gauge, permissions: ['analytics.view'], keywords: ["monitoring", "speed", "metrics"], description: "Performance monitoring" },
      { name: "Error Tracking", href: "/errors", icon: Bug, permissions: ['analytics.view'], keywords: ["bugs", "issues", "debugging"], description: "Error logs" },
      { name: "System Alerts", href: "/alerts", icon: AlertTriangle, permissions: ['analytics.view'], keywords: ["warnings", "notifications"], description: "System alerts" },
      { name: "Documentation", href: "/admin/docs", icon: BookOpen, roles: ['admin'], keywords: ["docs", "help", "guide", "manual"], description: "System documentation" },
      { name: "Help", href: "/help", icon: HelpCircle, keywords: ["support", "faq", "documentation"], description: "Help center" },
      { name: "User Management", href: "/users", icon: Users, permissions: ['users.view', 'users.manage'], keywords: ["team"], description: "Manage users" },
      { name: "API & Integrations", href: "/api", icon: Code, permissions: ['api.view', 'settings.integrations'], keywords: ["developer"], description: "API keys" },
      { name: "Automation", href: "/zapier-templates", icon: Workflow, permissions: ['settings.integrations'], keywords: ["zapier"], description: "Zapier integrations" },
      { name: "Settings", href: "/settings/account", icon: SettingsIcon, permissions: ['settings.view'], keywords: ["configuration"], description: "Settings" },
    ]
  },
  { 
    label: "Agency", 
    collapsible: true, 
    roles: ['agency_owner'], 
    items: [
      { name: "Client Management", href: "/agency-management", icon: Building2, roles: ['agency_owner'], permissions: ['clients.view', 'clients.manage'], keywords: ["clients"], description: "Manage clients" },
    ]
  },
];

export function Sidebar() {
  const location = useLocation();
  const isOnSettingsPage = location.pathname.startsWith('/settings');
  const { user, hasAnyPermission, roles } = useAuth();
  const { currentOrg } = useTenant();
  const { open, state } = useSidebar();
  const collapsed = state === "collapsed";
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Core"]));
  const visibleSettingsTabs = useSettingsTabs();
  const { data: menuCounts } = useMenuItemCounts();

  const hasRole = (role: AppRole) => roles.some(r => r.role === role);

  const visibleGroups = useMemo(() => {
    return navigationGroups.map(g => ({
      ...g,
      items: g.items.filter(i => {
        if (i.roles?.length && !i.roles.some(hasRole)) return false;
        if (i.permissions?.length && !hasAnyPermission(i.permissions)) return false;
        return true;
      }).map(i => i.name === "Campaigns" ? {...i, count: menuCounts?.mailedCampaigns} : i)
    })).filter(g => {
      if (g.roles?.length && !g.roles.some(hasRole)) return false;
      if (g.permissions?.length && !hasAnyPermission(g.permissions)) return false;
      if (g.label === "Agency" && hasRole('admin') && currentOrg?.type !== 'agency') return false;
      return g.items.length > 0;
    });
  }, [user, hasAnyPermission, currentOrg, roles, menuCounts]);

  useEffect(() => {
    const activeGroup = visibleGroups.find(g => 
      g.items.some(i => location.pathname === i.href || location.pathname.startsWith(i.href + '/'))
    );
    const newOpenGroups = new Set<string>();
    if (activeGroup?.label) newOpenGroups.add(activeGroup.label);
    setOpenGroups(newOpenGroups);
  }, [location.pathname, visibleGroups]);

  const allSearchableItems = useMemo(() => visibleGroups.flatMap(g => g.items.map(i => ({...i, groupLabel: g.label}))), [visibleGroups]);
  const searchResults = useMenuSearch(allSearchableItems, searchQuery);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
      if (e.key === 'Escape' && searchQuery) setSearchQuery("");
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const toggleGroup = (label: string) => setOpenGroups(p => {
    const n = new Set(p);
    n.has(label) ? n.delete(label) : n.add(label);
    return n;
  });

  if (isOnSettingsPage) {
    return (
      <SidebarRoot collapsible="icon" className={collapsed ? "w-14" : "w-60"}>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="px-4 py-3 flex items-center justify-between">
            {!collapsed && <h2 className="text-lg font-semibold">Settings</h2>}
            <NavLink to="/">
              <Button variant="ghost" size="icon" title="Back to main menu">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </NavLink>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {visibleSettingsTabs.map(t => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton asChild>
                    <NavLink to={`/settings/${t.id}`} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                      <t.icon className="h-4 w-4" />
                      {!collapsed && <span>{t.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </SidebarRoot>
    );
  }

  return (
    <SidebarRoot collapsible="icon" className={collapsed ? "w-14" : "w-60"}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-4 py-4 flex items-center gap-3">
          {!collapsed ? (
            <>
              <img src="/favicon.png" alt="Mobul ACE" className="h-8 w-8" />
              <h2 className="text-xl font-bold">Mobul ACE</h2>
            </>
          ) : (
            <img src="/favicon.png" alt="Mobul ACE" className="h-6 w-6 mx-auto" />
          )}
        </div>
      </SidebarHeader>
      <SidebarSearch value={searchQuery} onChange={setSearchQuery} collapsed={collapsed} />
      <SidebarContent>
        {searchQuery ? (
          <SidebarGroup>
            <SidebarGroupLabel>Results ({searchResults.length})</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {searchResults.map(i => (
                  <SidebarMenuItem key={i.href}>
                    <SidebarMenuButton asChild>
                      <NavLink to={i.href} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                        <i.icon className="h-4 w-4" />
                        {!collapsed && <div className="flex-1 flex justify-between"><span>{i.name}</span><span className="text-xs text-muted-foreground">{i.groupLabel}</span></div>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          visibleGroups.map(g => (
            <Collapsible key={g.label} open={!g.collapsible || openGroups.has(g.label)} onOpenChange={() => g.collapsible && toggleGroup(g.label)}>
              <SidebarGroup>
                {g.collapsible ? (
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 flex justify-between">
                      <span>{!collapsed && g.label}</span>
                      {!collapsed && <ChevronRight className={`h-4 w-4 transition-transform ${openGroups.has(g.label) ? 'rotate-90' : ''}`} />}
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                ) : <SidebarGroupLabel>{!collapsed && g.label}</SidebarGroupLabel>}
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {g.items.map(i => (
                        <SidebarMenuItem key={i.href}>
                          <SidebarMenuButton asChild>
                            <NavLink to={i.href} end className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                              <i.icon className="h-4 w-4" />
                              {!collapsed && <div className="flex-1 flex justify-between"><span>{i.name}</span>{i.count ? <Badge variant="secondary">{i.count}</Badge> : null}</div>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ))
        )}
      </SidebarContent>
    </SidebarRoot>
  );
}
