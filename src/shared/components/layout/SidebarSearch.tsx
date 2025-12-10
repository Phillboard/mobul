import { Input } from "@/shared/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  collapsed?: boolean;
}

export function SidebarSearch({
  value,
  onChange,
  placeholder = "Search menu...",
  collapsed = false,
}: SidebarSearchProps) {
  if (collapsed) {
    return null;
  }

  return (
    <div className="relative px-3 py-2">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        id="sidebar-menu-search"
        name="sidebar-menu-search"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search menu"
        className="pl-9 pr-9 h-9 bg-sidebar-accent/50 border-sidebar-border/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-sidebar-accent"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
        {!value && (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 font-mono text-[10px]">
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  );
}
