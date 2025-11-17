import { Task } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, Calendar } from "lucide-react";

interface TaskBoardProps {
  tasks: Task[];
  isLoading: boolean;
}

const statusColumns = [
  { status: 'pending', title: 'To Do', icon: Clock },
  { status: 'in_progress', title: 'In Progress', icon: AlertCircle },
  { status: 'completed', title: 'Done', icon: CheckCircle2 },
];

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export function TaskBoard({ tasks, isLoading }: TaskBoardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statusColumns.map((col) => (
          <Card key={col.status}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {statusColumns.map((column) => {
        const columnTasks = tasks.filter(t => t.status === column.status);
        const Icon = column.icon;

        return (
          <Card key={column.status}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {column.title}
                <Badge variant="secondary" className="ml-auto">
                  {columnTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {columnTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No tasks
                </p>
              ) : (
                columnTasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                  const priorityColor = priorityColors[task.priority];

                  return (
                    <Card key={task.id} className={`${isOverdue ? 'border-destructive' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <div className={`w-1 h-full rounded ${priorityColor}`} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-2">{task.title}</h4>
                            
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize">
                                {task.task_type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {task.priority}
                              </Badge>
                            </div>

                            {task.due_date && (
                              <div className={`flex items-center gap-1 mt-2 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.due_date), "MMM d, yyyy")}
                                {isOverdue && <span className="font-semibold">(Overdue)</span>}
                              </div>
                            )}

                            {task.contacts && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {task.contacts.first_name} {task.contacts.last_name}
                              </div>
                            )}

                            {task.assigned_to && (
                              <div className="text-xs text-muted-foreground mt-2">
                                Assigned to: {task.assigned_to.full_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
