import { useNavigate, useLocation } from "react-router-dom";
import { Home, Mail, Users, FileText, MoreHorizontal, Globe, Settings, Gift, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const primaryNavItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Mail, label: "Campaigns", path: "/campaigns" },
  { icon: Users, label: "Contacts", path: "/contacts" },
  { icon: FileText, label: "Mail", path: "/mail" },
];

const secondaryNavItems = [
  { icon: Globe, label: "Landing Pages", path: "/landing-pages", group: "Tools" },
  { icon: Users, label: "Audiences", path: "/audiences", group: "Tools" },
  { icon: TrendingUp, label: "Deals", path: "/deals", group: "CRM" },
  { icon: Gift, label: "Gift Cards", path: "/gift-cards", group: "Rewards" },
  { icon: Settings, label: "Settings", path: "/settings", group: "Admin" },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const groupedSecondaryItems = secondaryNavItems.reduce((acc, item) => {
    const group = item.group || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof secondaryNavItems>);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-2xl border-t border-border/30 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-[var(--radius)] transition-all duration-200 min-h-[56px] min-w-[64px]",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60 active:scale-95"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-all", active && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
              {active && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-glow-sm animate-pulse-scale" />
              )}
            </button>
          );
        })}
        
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-[var(--radius)] transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-card/60 active:scale-95 min-h-[56px] min-w-[64px]"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>More Navigation</SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {Object.entries(groupedSecondaryItems).map(([groupName, items]) => (
                <div key={groupName}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                    {groupName}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      
                      return (
                        <Button
                          key={item.path}
                          variant={active ? "default" : "outline"}
                          className="h-20 flex-col gap-2"
                          onClick={() => navigate(item.path)}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-xs text-center">{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <Separator className="mt-6" />
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
