import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardWidget } from '@/config/dashboardWidgets';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  index: number;
  onHide: (widgetId: string) => void;
  isDragMode: boolean;
  dateRange?: number;
}

const getSizeClasses = (size: string) => {
  const sizeMap: Record<string, string> = {
    'small': 'col-span-1',
    'medium': 'col-span-1 md:col-span-2',
    'large': 'col-span-1 md:col-span-2 lg:col-span-3',
    'full': 'col-span-1 md:col-span-2 lg:col-span-4'
  };
  return sizeMap[size] || 'col-span-1';
};

export function DraggableWidget({ widget, index, onHide, isDragMode, dateRange }: DraggableWidgetProps) {
  const Component = widget.component;

  return (
    <Draggable draggableId={widget.id} index={index} isDragDisabled={!isDragMode}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "relative transition-all",
            getSizeClasses(widget.defaultSize),
            snapshot.isDragging && "z-50 rotate-2 scale-105",
            isDragMode && "ring-2 ring-primary/20 rounded-xl animate-pulse-slow"
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.05,
            ease: "easeOut"
          }}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.5 : 1,
          }}
        >
          {isDragMode && (
            <motion.div 
              className="absolute -top-3 -right-3 z-10 flex gap-2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
            >
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 shadow-lg hover:shadow-xl transition-shadow"
                onClick={() => onHide(widget.id)}
                title="Hide widget"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
              <div
                {...provided.dragHandleProps}
                className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg hover:shadow-xl hover:scale-110 transition-all active:scale-95"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            </motion.div>
          )}
          {snapshot.isDragging && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/50 rounded-xl" />
          )}
          <Component {...widget.props} dateRange={dateRange} />
        </motion.div>
      )}
    </Draggable>
  );
}
