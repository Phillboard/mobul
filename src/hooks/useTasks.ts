import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  client_id: string;
  external_crm_id?: string;
  task_type: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'other';
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_user_id?: string;
  created_by_user_id?: string;
  due_date?: string;
  reminder_at?: string;
  completed_at?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  campaign_id?: string;
  linked_activity_id?: string;
  sync_enabled?: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
  contacts?: any;
  companies?: any;
  deals?: any;
  assigned_to?: any;
  created_by?: any;
}

export function useTasks(clientId: string | null, filters?: {
  assignedTo?: string;
  status?: string;
  priority?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  return useQuery({
    queryKey: ['tasks', clientId, filters],
    queryFn: async () => {
      if (!clientId) return [];
      
      let query = (supabase as any)
        .from('tasks')
        .select(`
          *,
          contacts(first_name, last_name, email),
          companies(company_name),
          deals(deal_name),
          assigned_to:profiles!tasks_assigned_to_user_id_fkey(full_name, email),
          created_by:profiles!tasks_created_by_user_id_fkey(full_name, email)
        `)
        .eq('client_id', clientId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters?.assignedTo) {
        query = query.eq('assigned_to_user_id', filters.assignedTo);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }
      if (filters?.companyId) {
        query = query.eq('company_id', filters.companyId);
      }
      if (filters?.dealId) {
        query = query.eq('deal_id', filters.dealId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!clientId,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(`
          *,
          contacts(first_name, last_name, email, phone),
          companies(company_name),
          deals(deal_name),
          assigned_to:profiles!tasks_assigned_to_user_id_fkey(full_name, email),
          created_by:profiles!tasks_created_by_user_id_fkey(full_name, email)
        `)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Task created",
        description: "The task has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTask() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
