/**
 * KeyboardShortcutsHelp Component
 * 
 * Displays all available keyboard shortcuts in a modal dialog.
 * Access via ? key or from help menu.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Keyboard } from "lucide-react";
import { getKeyboardShortcuts } from '@shared/hooks';
import { useFeatureFlags } from '@shared/hooks';

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const { isEnabled } = useFeatureFlags();
  const shortcuts = getKeyboardShortcuts();

  // Open help with ? key
  useEffect(() => {
    if (!isEnabled('keyboard_shortcuts')) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled]);

  if (!isEnabled('keyboard_shortcuts')) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster. Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">?</kbd> anytime to see this help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.modifiers.map((mod, i) => (
                        <kbd 
                          key={i}
                          className="px-2 py-1 bg-background border rounded text-xs font-mono"
                        >
                          {mod}
                        </kbd>
                      ))}
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          On Windows, use <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> instead of <kbd className="px-1 py-0.5 bg-muted rounded">⌘</kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}

