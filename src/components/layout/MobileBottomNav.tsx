import { useNavigate, useLocation } from "react-router-dom";
import { Home, Mail, Users, FileText, MoreHorizontal } from "lucide-react";
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

const navItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: Mail, label: "Campaigns", path: "/campaigns" },
  { icon: Users, label: "Contacts", path: "/contacts" },
  { icon: FileText, label: "Templates", path: "/templates" },
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-h-[56px] min-w-[64px]",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50 active:scale-95"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-glow")} />
              <span className="text-xs font-medium">{item.label}</span>
              {active && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-glow-sm" />
              )}
            </button>
          );
        })}
        
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent/50 active:scale-95 min-h-[56px] min-w-[64px]"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  navigate("/audiences");
                }}
              >
                <Users className="h-6 w-6" />
                <span className="text-xs">Audiences</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  navigate("/analytics");
                }}
              >
                <FileText className="h-6 w-6" />
                <span className="text-xs">Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  navigate("/settings");
                }}
              >
                <MoreHorizontal className="h-6 w-6" />
                <span className="text-xs">Settings</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
