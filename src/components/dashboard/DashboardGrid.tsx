import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { DraggableWidget } from './DraggableWidget';
import { DashboardWidget } from '@/config/dashboardWidgets';

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
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`grid gap-6 ${snapshot.isDraggingOver ? 'bg-accent/5 rounded-lg p-2' : ''}`}
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
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
