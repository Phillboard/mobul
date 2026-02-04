import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, Mail, FileText, Users, Gift, Phone,
  Globe, Activity, ListTodo, ChevronRight, ArrowLeft, FormInput,
  Gauge, BookOpen, List, Upload, FolderTree, Rocket, TestTube,
  Megaphone, Headphones, ClipboardList, UserCog,
  PhoneCall, Target, Plug, Settings as SettingsIcon, Package, Building2, CreditCard,
  MessageSquare, Zap, Send
} from "lucide-react";
import { NavLink } from "@/shared/components/NavLink";
import { useAuth } from "@core/auth/AuthProvider";
import { useTenant } from "@/contexts/TenantContext";
import { settingsTabs } from '@/core/config/settingsConfig';
import { useSettingsTabs } from '@/features/settings/hooks';
import { useMenuSearch, SearchableNavItem } from '@/shared/hooks';
import { AppRole } from '@/core/auth/roles';
import { P } from '@/core/auth/permissionRegistry';
import { Button } from "@/shared/components/ui/button";
import {
  Sidebar as SidebarRoot, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar
} from "@/shared/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { SidebarSearch } from "./SidebarSearch";
import { Badge } from "@/shared/components/ui/badge";
import { useMenuItemCounts } from "@/shared/hooks";
import { DocumentationSidebar } from "@/features/documentation/components/DocumentationSidebar";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Link } from "react-router-dom";

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
      { name: "Dashboard", href: "/", icon: LayoutDashboard, permissions: [P.DASHBOARD_VIEW], keywords: ["home", "overview"], description: "Main dashboard" },
    ]
  },
  {
    label: "Campaigns",
    collapsible: true,
    permissions: [P.CAMPAIGNS_VIEW],
    items: [
      { name: "All Campaigns", href: "/campaigns", icon: Megaphone, permissions: [P.CAMPAIGNS_VIEW], keywords: ["mail", "postcards", "direct mail", "marketing"], description: "Manage direct mail campaigns" },
      { name: "Mail Library", href: "/mail", icon: Mail, permissions: [P.TEMPLATES_VIEW], keywords: ["design", "layouts", "postcard designs", "templates"], description: "Direct mail designs" },
      { name: "Landing Pages", href: "/landing-pages", icon: Globe, permissions: [P.LANDING_PAGES_VIEW], keywords: ["web", "purl", "personalized urls"], description: "Personalized landing pages" },
      { name: "Forms", href: "/forms", icon: FormInput, permissions: [P.FORMS_VIEW], keywords: ["forms", "lead capture", "redemption"], description: "Lead capture & gift card forms" },
    ]
  },
  {
    label: "Audience",
    collapsible: true,
    permissions: [P.CONTACTS_VIEW],
    items: [
      { name: "Contacts", href: "/contacts", icon: Users, permissions: [P.CONTACTS_VIEW], keywords: ["contacts", "customers", "crm", "people"], description: "Manage customer database" },
      { name: "Lists & Segments", href: "/contacts/lists", icon: List, permissions: [P.CONTACTS_VIEW], keywords: ["lists", "segments", "groups", "targeting"], description: "Organize and segment contacts" },
      { name: "Import Contacts", href: "/contacts/import", icon: Upload, permissions: [P.CONTACTS_IMPORT], keywords: ["import", "csv", "upload", "bulk"], description: "Import contacts from CSV" },
    ]
  },
  {
    label: "Marketing",
    collapsible: true,
    permissions: [P.CAMPAIGNS_VIEW],
    items: [
      { 
        name: "Marketing Hub", 
        href: "/marketing", 
        icon: LayoutDashboard,
        permissions: [P.CAMPAIGNS_VIEW],
        keywords: ["marketing", "overview", "dashboard"], 
        description: "Email & SMS marketing overview"
      },
      { 
        name: "Broadcasts", 
        href: "/marketing/broadcasts", 
        icon: Send,
        permissions: [P.CAMPAIGNS_VIEW],
        keywords: ["email", "sms", "blast", "newsletter", "broadcast", "campaign"], 
        description: "One-time email & SMS sends"
      },
      { 
        name: "Automations", 
        href: "/marketing/automations", 
        icon: Zap,
        permissions: [P.CAMPAIGNS_VIEW],
        keywords: ["automation", "workflow", "journey", "sequence", "drip"], 
        description: "Automated multi-step workflows"
      },
      { 
        name: "Content Library", 
        href: "/marketing/content", 
        icon: FileText,
        permissions: [P.TEMPLATES_VIEW],
        keywords: ["templates", "content", "library", "reusable"], 
        description: "Email & SMS templates"
      },
    ]
  },
  {
    label: "Rewards",
    collapsible: true,
    permissions: [P.GIFT_CARDS_VIEW],
    items: [
      { name: "Gift Card Inventory", href: "/gift-cards", icon: Gift, permissions: [P.GIFT_CARDS_MANAGE_POOLS], keywords: ["rewards", "inventory", "pools"], description: "Manage gift card inventory" },
      { name: "Credits & Billing", href: "/credits-billing", icon: CreditCard, permissions: [P.CREDITS_VIEW], keywords: ["credits", "billing", "auto-reload", "balance", "payments"], description: "Manage credits and billing" },
    ]
  },
  {
    label: "Call Center",
    collapsible: true,
    permissions: [P.CALL_CENTER_VIEW],
    items: [
      { name: "Redemption Center", href: "/call-center", icon: Headphones, permissions: [P.CALL_CENTER_REDEEM], keywords: ["redeem", "call center", "provision", "tracking", "calls"], description: "Redeem gift cards and track calls" },
      { name: "Call Scripts", href: "/call-center/scripts", icon: FileText, permissions: [P.CALL_CENTER_SCRIPTS], keywords: ["scripts", "training", "call flow"], description: "Manage call scripts" },
    ]
  },
  {
    label: "Monitoring",
    collapsible: true,
    permissions: [P.MONITORING_VIEW],
    items: [
      { name: "Activity & Logs", href: "/monitoring", icon: Activity, permissions: [P.MONITORING_VIEW], keywords: ["activity", "logs", "audit", "compliance", "events", "history", "tracking", "monitoring", "alerts"], description: "Unified activity logs, alerts, and system monitoring" },
    ]
  },
  {
    label: "My Account",
    collapsible: true,
    permissions: [P.GIFT_CARDS_VIEW, P.BILLING_VIEW],
    items: [
      { name: "My Gift Cards", href: "/client/gift-cards", icon: Gift, permissions: [P.GIFT_CARDS_VIEW], keywords: ["rewards", "gift cards", "client"], description: "View your gift cards" },
      { name: "Billing", href: "/client/billing", icon: CreditCard, permissions: [P.BILLING_VIEW], keywords: ["billing", "invoices", "payments"], description: "View billing and payments" },
    ]
  },
  {
    label: "Agency",
    collapsible: true,
    permissions: [P.AGENCIES_MANAGE],
    items: [
      { name: "Client Management", href: "/agency-management", icon: Users, permissions: [P.AGENCIES_MANAGE], keywords: ["clients", "agencies"], description: "Manage agency clients" },
    ]
  },
  {
    label: "Admin",
    collapsible: true,
    permissions: [P.USERS_VIEW, P.AGENCIES_VIEW, P.ADMIN_ORGANIZATIONS],
    items: [
      { name: "Organizations", href: "/admin/organizations", icon: Building2, permissions: [P.ADMIN_ORGANIZATIONS], keywords: ["agencies", "clients", "companies", "archive", "delete"], description: "Manage agencies & clients" },
      { name: "User Management", href: "/users", icon: UserCog, permissions: [P.USERS_VIEW], keywords: ["team", "permissions", "roles"], description: "Manage users & permissions" },
      { name: "Gift Cards", href: "/admin/gift-cards-dashboard", icon: Gift, permissions: [P.GIFT_CARDS_MARKETPLACE_ADMIN], keywords: ["marketplace", "inventory", "gift cards", "brands", "providers", "master pools", "admin", "financials", "revenue"], description: "Gift card management, inventory & financials" },
    ]
  },
];

export function Sidebar() {
  const location = useLocation();
  const isOnSettingsPage = location.pathname.startsWith('/settings');
  const isDocsPage = location.pathname.startsWith('/docs');
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
        // Permission-based filtering (primary check)
        if (i.permissions?.length && !hasAnyPermission(i.permissions)) return false;
        // Legacy role-based filtering (fallback for any remaining role checks)
        if (i.roles?.length && !i.roles.some(hasRole)) return false;
        return true;
      }).map(i => i.name === "Campaigns" ? { ...i, count: menuCounts?.mailedCampaigns } : i)
    })).filter(g => {
      // Group-level permission check (user needs at least one permission from the group)
      if (g.permissions?.length && !hasAnyPermission(g.permissions)) return false;
      // Legacy role-based filtering (fallback)
      if (g.roles?.length && !g.roles.some(hasRole)) return false;
      // Special case: Agency section only for agency context
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
    // Group tabs by their group property
    const groupedTabs = visibleSettingsTabs.reduce((acc, tab) => {
      const group = tab.group || 'other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(tab);
      return acc;
    }, {} as Record<string, typeof visibleSettingsTabs>);

    const groupLabels: Record<string, string> = {
      personal: 'Personal',
      client: 'Client Settings',
      integrations: 'Integrations',
      admin: 'Administration',
    };

    const groupOrder = ['personal', 'client', 'integrations', 'admin'];

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
          {groupOrder.map(groupId => {
            const tabs = groupedTabs[groupId];
            if (!tabs?.length) return null;

            return (
              <SidebarGroup key={groupId}>
                {!collapsed && (
                  <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-4 py-2">
                    {groupLabels[groupId]}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {tabs.map(t => (
                      <SidebarMenuItem key={t.id}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={`/settings/${t.id}`} 
                            end 
                            className="hover:bg-sidebar-accent flex items-center justify-between" 
                            activeClassName="bg-sidebar-accent font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <t.icon className="h-4 w-4" />
                              {!collapsed && <span>{t.label}</span>}
                            </div>
                            {!collapsed && t.status === 'coming_soon' && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                Soon
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </SidebarRoot>
    );
  }

  if (isDocsPage) {
    return (
      <SidebarRoot collapsible="icon" className={collapsed ? "w-14" : "w-60"}>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="px-4 py-3">
            {!collapsed ? (
              <>
                <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Main Menu
                </Link>
                <h2 className="text-lg font-semibold">Help Center</h2>
              </>
            ) : (
              <Link to="/">
                <Button variant="ghost" size="icon" title="Back to main menu">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          {!collapsed && (
            <ScrollArea className="flex-1">
              <div className="px-2 py-4">
                <DocumentationSidebar />
              </div>
            </ScrollArea>
          )}
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
              <img src="/favicon.png" alt="Mobul" className="h-8 w-8" />
              <h2 className="text-xl font-bold">Mobul</h2>
            </>
          ) : (
            <img src="/favicon.png" alt="Mobul" className="h-6 w-6 mx-auto" />
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
              <NavLink to="/docs" className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent font-medium">
                <BookOpen className="h-4 w-4" />
                {!collapsed && <span>Help</span>}
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
