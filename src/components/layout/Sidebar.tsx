import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Mail, FileText, Users, Gift, Phone,
  ShoppingCart, Globe, Activity, ListTodo, ChevronRight, ArrowLeft, FormInput,
  Gauge, BookOpen, List, Upload, FolderTree, Database, FileSearch, Rocket, TestTube,
  Megaphone, Headphones, ClipboardList, Shield, UserCog, ShieldAlert, CheckSquare,
  PhoneCall, Target, Plug, Settings as SettingsIcon, Package
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
  SidebarHeader, SidebarFooter, useSidebar
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
    label: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, permissions: ['dashboard.view'], keywords: ["home", "overview"], description: "Main dashboard" },
    ]
  },
  {
    label: "Campaigns",
    collapsible: true,
    items: [
      { name: "All Campaigns", href: "/campaigns", icon: Megaphone, permissions: ['campaigns.view'], keywords: ["mail", "postcards", "direct mail", "marketing"], description: "Manage direct mail campaigns" },
      { name: "Mail Library", href: "/mail", icon: Mail, permissions: ['templates.view'], keywords: ["design", "layouts", "postcard designs", "templates"], description: "Direct mail designs" },
      { name: "Landing Pages", href: "/landing-pages", icon: Globe, permissions: ['landingpages.view'], keywords: ["web", "purl", "personalized urls"], description: "Personalized landing pages" },
      { name: "ACE Forms", href: "/ace-forms", icon: FormInput, permissions: ['campaigns.view'], keywords: ["forms", "lead capture", "redemption"], description: "Lead capture & gift card forms" },
    ]
  },
  {
    label: "Audience",
    collapsible: true,
    items: [
      { name: "Contacts", href: "/contacts", icon: Users, permissions: ['contacts.view'], keywords: ["contacts", "customers", "crm", "people"], description: "Manage customer database" },
      { name: "Lists & Segments", href: "/contacts/lists", icon: List, permissions: ['contacts.view'], keywords: ["lists", "segments", "groups", "targeting"], description: "Organize and segment contacts" },
      { name: "Import Contacts", href: "/contacts/import", icon: Upload, permissions: ['contacts.create'], keywords: ["import", "csv", "upload", "bulk"], description: "Import contacts from CSV" },
    ]
  },
  {
    label: "Rewards",
    collapsible: true,
    items: [
      { name: "Gift Card Inventory", href: "/gift-cards", icon: Gift, permissions: ['gift_cards.manage', 'giftcards.view'], keywords: ["rewards", "inventory", "pools"], description: "Manage gift card inventory" },
      { name: "Purchase Cards", href: "/purchase-gift-cards", icon: Package, permissions: ['gift_cards.purchase', 'giftcards.purchase'], keywords: ["buy", "order"], description: "Purchase gift cards" },
      { name: "Marketplace", href: "/admin/gift-card-marketplace", icon: ShoppingCart, roles: ['admin'], permissions: ['giftcards.admin_view'], keywords: ["admin", "master", "platform"], description: "Platform gift card marketplace" },
    ]
  },
  {
    label: "Call Center",
    collapsible: true,
    items: [
      { name: "Call Tracking", href: "/call-center", icon: PhoneCall, permissions: ['calls.view', 'calls.manage'], keywords: ["calls", "phone", "tracking", "reports"], description: "Call tracking analytics" },
      { name: "Redemption Center", href: "/call-center/redeem", icon: Target, permissions: ['calls.confirm_redemption'], keywords: ["redeem", "call center", "provision"], description: "Redeem gift cards for callers" },
    ]
  },
  {
    label: "Workspace",
    collapsible: true,
    items: [
      { name: "Tasks", href: "/tasks", icon: CheckSquare, keywords: ["tasks", "todos", "follow-ups", "action items"], description: "Manage tasks and to-dos" },
      { name: "Activities", href: "/activities", icon: Activity, keywords: ["activities", "interactions", "timeline", "history"], description: "Track customer interactions" },
    ]
  },
  {
    label: "Agency",
    collapsible: true,
    roles: ['agency_owner'],
    items: [
      { name: "Client Management", href: "/agency-management", icon: Users, roles: ['agency_owner'], permissions: ['clients.view', 'clients.manage'], keywords: ["clients", "agencies"], description: "Manage agency clients" },
    ]
  },
  {
    label: "Admin",
    collapsible: true,
    roles: ['admin'],
    items: [
      { name: "Platform Overview", href: "/platform", icon: Shield, roles: ['admin'], keywords: ["platform", "overview", "stats"], description: "Platform-wide overview" },
      { name: "User Management", href: "/users", icon: UserCog, roles: ['admin'], keywords: ["team", "permissions", "roles"], description: "Manage users & permissions" },
      { name: "System Health", href: "/admin/system-health", icon: Activity, roles: ['admin'], keywords: ["analytics", "performance", "errors", "alerts", "monitoring"], description: "System monitoring & health" },
      { name: "Data Tools", href: "/enrich-data", icon: Database, roles: ['admin'], keywords: ["demo", "simulation", "seed"], description: "Data simulation & seeding" },
      { name: "Audit Log", href: "/admin/audit-log", icon: ShieldAlert, roles: ['admin'], keywords: ["audit", "logs", "history"], description: "User management audit trail" },
      { name: "Site Directory", href: "/admin/site-directory", icon: FileSearch, roles: ['admin'], keywords: ["pages", "routes", "navigation"], description: "All pages directory" },
      { name: "Beta & Launch", href: "/beta", icon: Rocket, roles: ['admin'], keywords: ["beta", "launch", "testing", "checklist"], description: "Beta testing & launch checklist" },
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
      }).map(i => i.name === "Campaigns" ? { ...i, count: menuCounts?.mailedCampaigns } : i)
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

  const allSearchableItems = useMemo(() => visibleGroups.flatMap(g => g.items.map(i => ({ ...i, groupLabel: g.label }))), [visibleGroups]);
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
    if (n.has(label)) {
      n.delete(label);
    } else {
      n.add(label);
    }
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
      
      <SidebarFooter className="border-t border-sidebar-border mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/admin/docs" className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                <BookOpen className="h-4 w-4" />
                {!collapsed && <span>Documentation</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/admin/integrations" className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                <Plug className="h-4 w-4" />
                {!collapsed && <span>Integrations</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                <SettingsIcon className="h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarRoot>
  );
}
