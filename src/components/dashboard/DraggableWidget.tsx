import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardWidget } from '@/config/dashboardWidgets';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  index: number;
  onHide: (widgetId: string) => void;
  isDragMode: boolean;
  dateRange?: number;
}

export function DraggableWidget({ widget, index, onHide, isDragMode, dateRange }: DraggableWidgetProps) {
  const Component = widget.component;

  return (
    <Draggable draggableId={widget.id} index={index} isDragDisabled={!isDragMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "relative transition-all",
            snapshot.isDragging && "opacity-50 rotate-1 scale-105 z-50",
            isDragMode && "ring-2 ring-primary/30 rounded-lg"
          )}
        >
          {isDragMode && (
            <div className="absolute -top-2 -right-2 z-10 flex gap-1">
              <Button
                size="icon"
                variant="destructive"
                className="h-7 w-7 shadow-lg"
                onClick={() => onHide(widget.id)}
                title="Hide widget"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
              <div
                {...provided.dragHandleProps}
                className="h-7 w-7 bg-primary text-primary-foreground rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:bg-primary/90 transition-colors"
                title="Drag to reorder"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
          <Component {...widget.props} dateRange={dateRange} />
        </div>
      )}
    </Draggable>
  );
}
