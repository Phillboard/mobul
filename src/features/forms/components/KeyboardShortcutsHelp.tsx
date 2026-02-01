import { Keyboard } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";

export function KeyboardShortcutsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
          <span className="hidden md:inline">Shortcuts</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Keyboard Shortcuts</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Speed up your workflow with these shortcuts
            </p>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Save form</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                Ctrl + S
              </kbd>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delete selected field</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                Delete
              </kbd>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Undo</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                Ctrl + Z
              </kbd>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Redo</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                Ctrl + Y
              </kbd>
            </div>
          </div>

          <div className="pt-2 border-t text-xs text-muted-foreground">
            💡 Tip: Use <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Cmd</kbd> instead of <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl</kbd> on Mac
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
