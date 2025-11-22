import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Zap,
  LayoutDashboard,
  Mail,
  Users,
  FileText,
  Settings as SettingsIcon,
  Gift,
  DollarSign,
  Building2,
  Handshake,
  ChevronDown,
  Workflow,
  Phone,
  Headphones,
  ListTodo,
  BarChart3,
  Home,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/roleUtils";
import { settingsConfig } from "@/lib/settingsConfig";
import { useSettingsTabs } from "@/hooks/useSettingsTabs";
import { SidebarSearch } from "./SidebarSearch";
import { useMenuSearch, type SearchableNavItem } from "@/hooks/useMenuSearch";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permissions?: string[];
  keywords?: string[];
  description?: string;
  count?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  permissions?: string[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { 
        name: "Dashboard", 
        href: "/", 
        icon: LayoutDashboard,
        keywords: ["home", "overview", "stats", "analytics", "insights"],
        description: "View your main dashboard and analytics"
      },
      { 
        name: "Campaigns", 
        href: "/campaigns", 
        icon: Mail,
        keywords: ["mail", "direct mail", "postcards", "send", "mailing"],
        description: "Create and manage direct mail campaigns"
      },
      { 
        name: "Templates", 
        href: "/templates", 
        icon: FileText,
        keywords: ["design", "postcards", "layouts", "builder"],
        description: "Design and manage postcard templates"
      },
      { 
        name: "Audiences", 
        href: "/audiences", 
        icon: Users,
        keywords: ["contacts", "recipients", "mailing list", "import"],
        description: "Manage recipient lists and contacts"
      },
    ],
  },
  {
    label: "CRM",
    items: [
      { 
        name: "Contacts", 
        href: "/contacts", 
        icon: Users,
        keywords: ["people", "clients", "customers", "crm"],
        description: "Manage individual contacts"
      },
      { 
        name: "Companies", 
        href: "/companies", 
        icon: Building2,
        keywords: ["organizations", "businesses", "accounts", "crm"],
        description: "Manage company accounts"
      },
      { 
        name: "Deals", 
        href: "/deals", 
        icon: Handshake,
        keywords: ["opportunities", "pipeline", "sales", "crm"],
        description: "Track sales opportunities"
      },
      { 
        name: "Tasks", 
        href: "/tasks", 
        icon: ListTodo,
        keywords: ["todos", "activities", "reminders", "crm"],
        description: "Manage tasks and activities"
      },
    ],
    permissions: ["view_crm"],
  },
  {
    label: "Rewards",
    items: [
      {
        name: "Gift Card Manager",
        href: "/gift-cards",
        icon: Gift,
        permissions: ["view_gift_cards"],
        keywords: ["rewards", "incentives", "gifts", "cards", "inventory"],
        description: "Manage gift card inventory and pools"
      },
      {
        name: "Purchase Cards",
        href: "/purchase-gift-cards",
        icon: DollarSign,
        permissions: ["manage_gift_cards"],
        keywords: ["buy", "acquire", "order", "rewards"],
        description: "Purchase gift cards from marketplace"
      },
    ],
  },
  {
    label: "Call Center",
    items: [
      {
        name: "Agent Dashboard",
        href: "/agent-call-dashboard",
        icon: Headphones,
        permissions: ["manage_calls"],
        keywords: ["calls", "phone", "agent", "tracking", "inbound"],
        description: "Handle incoming calls and track conditions"
      },
      {
        name: "Call Analytics",
        href: "/call-center-dashboard",
        icon: Phone,
        permissions: ["view_call_analytics"],
        keywords: ["reports", "metrics", "tracking", "phone", "statistics"],
        description: "View call center analytics and reports"
      },
    ],
    permissions: ["view_call_center"],
  },
  {
    label: "Administration",
    items: [
      {
        name: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        permissions: ["view_analytics"],
        keywords: ["reports", "metrics", "data", "insights", "performance"],
        description: "View detailed analytics and reports"
      },
      {
        name: "Automation",
        href: "/zapier-templates",
        icon: Workflow,
        permissions: ["manage_integrations"],
        keywords: ["zapier", "integrations", "workflows", "api", "webhooks", "connect"],
        description: "Set up Zapier integrations and automations"
      },
      {
        name: "Platform Admin",
        href: "/platform-dashboard",
        icon: Home,
        permissions: ["platform_admin"],
        keywords: ["admin", "master", "platform", "system"],
        description: "Platform-level administration"
      },
      {
        name: "Agency Management",
        href: "/agency-management",
        icon: Building2,
        permissions: ["manage_agencies"],
        keywords: ["agencies", "clients", "white-label", "partners"],
        description: "Manage agency clients and relationships"
      },
      { 
        name: "Settings", 
        href: "/settings/account", 
        icon: SettingsIcon,
        keywords: ["preferences", "account", "profile", "configuration", "zapier", "integrations", "api"],
        description: "Configure account and integration settings"
      },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const isOnSettingsPage = location.pathname.startsWith("/settings");
  const { state } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter navigation based on permissions
  const visibleGroups = useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.permissions) return true;
          return item.permissions.some((permission) =>
            hasPermission(user, permission)
          );
        }),
      }))
      .filter((group) => {
        // Check if user has group-level permissions
        if (group.permissions && user) {
          const hasGroupPermission = group.permissions.some((permission) =>
            hasPermission(user, permission)
          );
          if (!hasGroupPermission) return false;
        }
        return group.items.length > 0;
      });
  }, [user]);

  // Flatten all items for search
  const allSearchableItems = useMemo(() => {
    const items: SearchableNavItem[] = [];
    visibleGroups.forEach((group) => {
      group.items.forEach((item) => {
        items.push({
          ...item,
          groupLabel: group.label,
        });
      });
    });
    return items;
  }, [visibleGroups]);

  // Search results
  const searchResults = useMenuSearch(allSearchableItems, searchQuery);

  // Determine which groups have matches
  const groupsWithMatches = useMemo(() => {
    const groups = new Set<string>();
    searchResults.forEach((result) => {
      if (result.groupLabel) {
        groups.add(result.groupLabel);
      }
    });
    return groups;
  }, [searchResults]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder="Search menu..."]'
        );
        searchInput?.focus();
      }
      // ESC to clear search
      if (e.key === "Escape" && searchQuery) {
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const settingsTabs = useSettingsTabs();

  // Render settings-specific sidebar
  if (isOnSettingsPage) {
    return (
      <SidebarComponent collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-16 items-center gap-2 px-3">
            {state === "expanded" ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-[--radius] bg-gradient-to-br from-primary to-accent shadow-sm">
                  <SettingsIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sidebar-foreground">Settings</span>
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-[--radius] bg-gradient-to-br from-primary to-accent">
                <SettingsIcon className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* Search in Settings */}
        <SidebarSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search settings..."
          collapsed={state === "collapsed"}
        />

        <SidebarContent>
          <SidebarMenu>
            {/* Show filtered results if searching */}
            {searchQuery ? (
              searchResults
                .filter((result) => result.href.startsWith("/settings"))
                .map((result) => (
                  <SidebarMenuItem key={result.href}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={result.href}
                        end
                        className="hover:bg-primary/8 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                        activeClassName="bg-primary/15 text-primary border-l-3 border-primary shadow-[0_0_15px_rgba(139,201,232,0.2)]"
                      >
                        <result.icon className="h-4 w-4" />
                        {state === "expanded" && <span>{result.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
            ) : (
              /* Show all settings tabs normally */
              settingsTabs.map((setting) => (
                <SidebarMenuItem key={setting.id}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/settings/${setting.id}`}
                      end
                      className="hover:bg-primary/8 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                      activeClassName="bg-primary/15 text-primary border-l-3 border-primary shadow-[0_0_15px_rgba(139,201,232,0.2)]"
                    >
                      <setting.icon className="h-4 w-4" />
                      {state === "expanded" && <span>{setting.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>

          {/* No results message */}
          {searchQuery && searchResults.length === 0 && state === "expanded" && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              <p>No settings found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </SidebarContent>
      </SidebarComponent>
    );
  }

  // Render regular sidebar
  return (
    <SidebarComponent collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-16 items-center gap-2 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[--radius] bg-gradient-to-br from-primary to-accent shadow-sm">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {state === "expanded" && (
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ACE Engage
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* Search Bar */}
      <SidebarSearch
        value={searchQuery}
        onChange={setSearchQuery}
        collapsed={state === "collapsed"}
      />

      <SidebarContent>
        {/* Show search results or normal groups */}
        {searchQuery ? (
          /* Search results mode */
          <>
            {visibleGroups.map((group) => {
              const groupHasMatches = groupsWithMatches.has(group.label);
              if (!groupHasMatches) return null;

              const groupResults = searchResults.filter(
                (r) => r.groupLabel === group.label
              );

              return (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupResults.map((result) => (
                        <SidebarMenuItem key={result.href}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={result.href}
                              end
                              className="hover:bg-primary/8 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                              activeClassName="bg-primary/15 text-primary border-l-3 border-primary shadow-[0_0_15px_rgba(139,201,232,0.2)]"
                            >
                              <result.icon className="h-4 w-4" />
                              {state === "expanded" && (
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="truncate">{result.name}</span>
                                  {result.description && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {result.description}
                                    </span>
                                  )}
                                </div>
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

            {/* No results message */}
            {searchResults.length === 0 && state === "expanded" && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <p>No menu items found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </>
        ) : (
          /* Normal navigation mode */
          visibleGroups.map((group, groupIndex) => {
            const isLastGroup = groupIndex === visibleGroups.length - 1;

            // If the group is collapsible, wrap it in Collapsible
            if (group.collapsible) {
              return (
                <Collapsible
                  key={group.label}
                  defaultOpen={group.items.some((item) =>
                    location.pathname.startsWith(item.href)
                  )}
                  className="group/collapsible"
                >
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wider hover:bg-primary/5 rounded-[--radius] transition-colors">
                        {group.label}
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.items.map((item) => (
                            <SidebarMenuItem key={item.name}>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={item.href}
                                  end
                                  className="hover:bg-primary/8 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                                  activeClassName="bg-primary/15 text-primary border-l-3 border-primary shadow-[0_0_15px_rgba(139,201,232,0.2)]"
                                >
                                  <item.icon className="h-4 w-4" />
                                  {state === "expanded" && <span>{item.name}</span>}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                  {!isLastGroup && <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-2" />}
                </Collapsible>
              );
            }

            // Otherwise, render normally
            return (
              <div key={group.label}>
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.href}
                              end
                              className="hover:bg-primary/8 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                              activeClassName="bg-primary/15 text-primary border-l-3 border-primary shadow-[0_0_15px_rgba(139,201,232,0.2)]"
                            >
                              <item.icon className="h-4 w-4" />
                              {state === "expanded" && <span>{item.name}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                {!isLastGroup && <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-2" />}
              </div>
            );
          })
        )}
      </SidebarContent>
    </SidebarComponent>
  );
}
