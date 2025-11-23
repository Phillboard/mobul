import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { DraggableWidget } from './DraggableWidget';
import { DashboardWidget } from '@/config/dashboardWidgets';
import { motion } from 'framer-motion';

interface DashboardGridProps {
  widgets: DashboardWidget[];
  layout: string[];
  isDragMode: boolean;
  onReorder: (newLayout: string[]) => void;
  onHideWidget: (widgetId: string) => void;
  dateRange?: number;
}

export function DashboardGrid({ 
  widgets, 
  layout, 
  isDragMode, 
  onReorder, 
  onHideWidget,
  dateRange 
}: DashboardGridProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newLayout = Array.from(layout);
    const [removed] = newLayout.splice(result.source.index, 1);
    newLayout.splice(result.destination.index, 0, removed);

    onReorder(newLayout);
  };

  const orderedWidgets = layout
    .map(id => widgets.find(w => w.id === id))
    .filter(Boolean) as DashboardWidget[];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard">
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${
              snapshot.isDraggingOver ? 'bg-primary/5 rounded-xl p-2 transition-colors' : ''
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {orderedWidgets.map((widget, index) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                index={index}
                onHide={onHideWidget}
                isDragMode={isDragMode}
                dateRange={dateRange}
              />
            ))}
            {provided.placeholder}
          </motion.div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
