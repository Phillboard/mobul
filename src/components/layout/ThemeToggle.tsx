import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils/utils';

/**
 * ThemeToggle Component
 * 
 * Premium theme switcher with smooth animations and glassmorphism.
 * Allows users to toggle between light and dark modes.
 * 
 * Features:
 * - Smooth transitions
 * - Active state indicators
 * - Glassmorphism styling
 * - Pulse animation on active theme
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative inline-flex items-center gap-2 p-1 rounded-[var(--radius)] bg-card/50 backdrop-blur-sm border border-border/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme("light")}
        className={cn(
          "relative h-8 w-8 rounded-[calc(var(--radius)-2px)] transition-all duration-200",
          theme === "light" 
            ? "bg-primary/10 text-primary shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="h-4 w-4" />
        {theme === "light" && (
          <span className="absolute inset-0 rounded-[calc(var(--radius)-2px)] bg-primary/20 animate-pulse-scale" />
        )}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme("dark")}
        className={cn(
          "relative h-8 w-8 rounded-[calc(var(--radius)-2px)] transition-all duration-200",
          theme === "dark" 
            ? "bg-primary/10 text-primary shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="h-4 w-4" />
        {theme === "dark" && (
          <span className="absolute inset-0 rounded-[calc(var(--radius)-2px)] bg-primary/20 animate-pulse-scale" />
        )}
      </Button>
    </div>
  );
}
