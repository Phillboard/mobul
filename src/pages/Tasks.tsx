import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useTasks } from "@/hooks/useTasks";
import { TaskBoard } from "@/components/activities/TaskBoard";
import { TaskForm } from "@/components/activities/TaskForm";

export default function Tasks() {
  const { currentClient } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const { data: tasks, isLoading } = useTasks(currentClient?.id || null, {
    status: filterStatus,
  });

  const taskCounts = {
    all: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
  };

  const overdueCount = tasks?.filter(t => 
    t.status !== 'completed' && 
    t.due_date && 
    new Date(t.due_date) < new Date()
  ).length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground mt-2">
              Manage your tasks and to-dos
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{taskCounts.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{taskCounts.in_progress}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{taskCounts.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Board */}
        <TaskBoard tasks={tasks || []} isLoading={isLoading} />

        {/* Task Form Dialog */}
        <TaskForm
          open={showForm}
          onOpenChange={setShowForm}
          clientId={currentClient?.id || ''}
        />
      </div>
    </Layout>
  );
}
