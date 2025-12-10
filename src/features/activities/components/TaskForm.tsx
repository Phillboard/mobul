import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCreateTask } from '@/features/activities/hooks';
import { useAuth } from '@core/auth/AuthProvider';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export function TaskForm({ 
  open, 
  onOpenChange, 
  clientId,
  contactId,
  companyId,
  dealId
}: TaskFormProps) {
  const { user } = useAuth();
  const createTask = useCreateTask();
  const [formData, setFormData] = useState({
    task_type: 'call' as const,
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    status: 'pending' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTask.mutateAsync({
      client_id: clientId,
      created_by_user_id: user?.id,
      assigned_to_user_id: user?.id,
      contact_id: contactId,
      company_id: companyId,
      deal_id: dealId,
      task_type: formData.task_type,
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
      status: formData.status,
    });

    onOpenChange(false);
    setFormData({
      task_type: 'call',
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      status: 'pending',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select 
                value={formData.task_type} 
                onValueChange={(value: any) => setFormData({ ...formData, task_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Call John about proposal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add task details..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
