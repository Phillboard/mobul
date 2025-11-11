import {
  ContextMenu as ContextMenuPrimitive,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Edit,
  Layers,
} from "lucide-react";

interface ContextMenuProps {
  children: React.ReactNode;
  layer: any;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onToggleLock: () => void;
}

export function ContextMenu({
  children,
  layer,
  onEdit,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onToggleLock,
}: ContextMenuProps) {
  return (
    <ContextMenuPrimitive>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={onEdit} className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Properties
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onDuplicate} className="gap-2">
          <Copy className="h-4 w-4" />
          Duplicate
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
          <span className="ml-auto text-xs text-muted-foreground">Del</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onBringToFront} className="gap-2">
          <ArrowUp className="h-4 w-4" />
          Bring to Front
        </ContextMenuItem>

        <ContextMenuItem onClick={onSendToBack} className="gap-2">
          <ArrowDown className="h-4 w-4" />
          Send to Back
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={onToggleLock} className="gap-2">
          {layer?.locked ? (
            <>
              <Unlock className="h-4 w-4" />
              Unlock
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Lock
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPrimitive>
  );
}
