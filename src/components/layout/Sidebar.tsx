import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  BarChart3, 
  Code2, 
  Settings,
  Zap
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Mail },
  { name: "Audiences", href: "/audiences", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "API & Webhooks", href: "/api", icon: Code2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
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
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
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

        {/* User info */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              OA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                Org Admin
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                admin@aceengage.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
