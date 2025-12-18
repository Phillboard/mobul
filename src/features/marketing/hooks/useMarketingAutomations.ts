/**
 * Marketing Automations Hook
 * 
 * Provides CRUD operations for marketing automation workflows.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from "sonner";
import type { 
  MarketingAutomation, 
  AutomationStep, 
  AutomationEnrollment,
  MarketingAutomationWithSteps,
  AutomationFilters,
  TriggerType,
  AutomationTriggerConfig,
  AutomationStats
} from '../types';

const QUERY_KEY = 'marketing-automations';

// ============================================================================
// LIST AUTOMATIONS
// ============================================================================

export function useMarketingAutomations(filters?: AutomationFilters) {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: [QUERY_KEY, currentClient?.id, filters],
    queryFn: async () => {
      if (!currentClient?.id) return [];

      let query = supabase
        .from('marketing_automations')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.trigger_type?.length) {
        query = query.in('trigger_type', filters.trigger_type);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketingAutomation[];
    },
    enabled: !!currentClient?.id,
  });
}

// ============================================================================
// GET SINGLE AUTOMATION
// ============================================================================

export function useMarketingAutomation(id: string | undefined) {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: automation, error: automationError } = await supabase
        .from('marketing_automations')
        .select('*')
        .eq('id', id)
        .single();

      if (automationError) throw automationError;

      const { data: steps, error: stepsError } = await supabase
        .from('marketing_automation_steps')
        .select('*')
        .eq('automation_id', id)
        .order('step_order');

      if (stepsError) throw stepsError;

      return {
        ...automation,
        steps: steps || [],
      } as MarketingAutomationWithSteps;
    },
    enabled: !!id && !!currentClient?.id,
  });
}

// ============================================================================
// CREATE AUTOMATION
// ============================================================================

interface CreateAutomationInput {
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config: AutomationTriggerConfig;
  steps: Omit<AutomationStep, 'id' | 'automation_id' | 'created_at' | 'updated_at'>[];
}

export function useCreateAutomation() {
  const { currentClient } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAutomationInput) => {
      if (!currentClient?.id) throw new Error('No client selected');

      // Create automation
      const { data: automation, error: automationError } = await supabase
        .from('marketing_automations')
        .insert({
          client_id: currentClient.id,
          name: input.name,
          description: input.description,
          trigger_type: input.trigger_type,
          trigger_config: input.trigger_config,
          is_active: false,
        })
        .select()
        .single();

      if (automationError) throw automationError;

      // Create steps
      if (input.steps.length > 0) {
        const { error: stepsError } = await supabase
          .from('marketing_automation_steps')
          .insert(
            input.steps.map((step, index) => ({
              automation_id: automation.id,
              step_order: index + 1,
              step_type: step.step_type,
              template_id: step.template_id,
              config: step.config,
            }))
          );

        if (stepsError) throw stepsError;
      }

      return automation as MarketingAutomation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Automation "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create automation: ${error.message}`);
    },
  });
}

// ============================================================================
// UPDATE AUTOMATION
// ============================================================================

interface UpdateAutomationInput {
  id: string;
  name?: string;
  description?: string;
  trigger_type?: TriggerType;
  trigger_config?: AutomationTriggerConfig;
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAutomationInput) => {
      const { data, error } = await supabase
        .from('marketing_automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingAutomation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Automation "${data.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update automation: ${error.message}`);
    },
  });
}

// ============================================================================
// DELETE AUTOMATION
// ============================================================================

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Automation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete automation: ${error.message}`);
    },
  });
}

// ============================================================================
// TOGGLE AUTOMATION
// ============================================================================

export function useToggleAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('marketing_automations')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingAutomation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Automation ${data.is_active ? 'activated' : 'deactivated'}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle automation: ${error.message}`);
    },
  });
}

// ============================================================================
// AUTOMATION STEPS
// ============================================================================

export function useAutomationSteps(automationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'steps', automationId],
    queryFn: async () => {
      if (!automationId) return [];

      const { data, error } = await supabase
        .from('marketing_automation_steps')
        .select('*')
        .eq('automation_id', automationId)
        .order('step_order');

      if (error) throw error;
      return data as AutomationStep[];
    },
    enabled: !!automationId,
  });
}

export function useAddAutomationStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      automationId, 
      step 
    }: { 
      automationId: string; 
      step: Omit<AutomationStep, 'id' | 'automation_id' | 'created_at' | 'updated_at'> 
    }) => {
      const { data, error } = await supabase
        .from('marketing_automation_steps')
        .insert({
          automation_id: automationId,
          ...step,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AutomationStep;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'steps', data.automation_id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', data.automation_id] });
      toast.success('Step added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add step: ${error.message}`);
    },
  });
}

export function useUpdateAutomationStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, automationId, ...updates }: Partial<AutomationStep> & { id: string; automationId: string }) => {
      const { data, error } = await supabase
        .from('marketing_automation_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { step: data as AutomationStep, automationId };
    },
    onSuccess: ({ automationId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'steps', automationId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', automationId] });
      toast.success('Step updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update step: ${error.message}`);
    },
  });
}

export function useDeleteAutomationStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, automationId }: { stepId: string; automationId: string }) => {
      const { error } = await supabase
        .from('marketing_automation_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
      return automationId;
    },
    onSuccess: (automationId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'steps', automationId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', automationId] });
      toast.success('Step deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete step: ${error.message}`);
    },
  });
}

export function useReorderAutomationSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ automationId, stepIds }: { automationId: string; stepIds: string[] }) => {
      // Update each step with new order
      const updates = stepIds.map((id, index) => 
        supabase
          .from('marketing_automation_steps')
          .update({ step_order: index + 1 })
          .eq('id', id)
      );

      await Promise.all(updates);
      return automationId;
    },
    onSuccess: (automationId) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'steps', automationId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', automationId] });
      toast.success('Steps reordered');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder steps: ${error.message}`);
    },
  });
}

// ============================================================================
// ENROLLMENTS
// ============================================================================

export function useAutomationEnrollments(automationId: string | undefined, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: [QUERY_KEY, 'enrollments', automationId, page, pageSize],
    queryFn: async () => {
      if (!automationId) return { enrollments: [], total: 0 };

      const { data, error, count } = await supabase
        .from('marketing_automation_enrollments')
        .select('*, contacts(first_name, last_name, email, phone)', { count: 'exact' })
        .eq('automation_id', automationId)
        .order('enrolled_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      return {
        enrollments: data as (AutomationEnrollment & { contacts: { first_name: string; last_name: string; email: string; phone: string } | null })[],
        total: count || 0,
      };
    },
    enabled: !!automationId,
  });
}

// ============================================================================
// AUTOMATION STATS
// ============================================================================

export function useAutomationStats(automationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'stats', automationId],
    queryFn: async (): Promise<AutomationStats> => {
      if (!automationId) {
        return {
          total_enrolled: 0,
          active_count: 0,
          completed_count: 0,
          completion_rate: 0,
          failed_count: 0,
          cancelled_count: 0,
        };
      }

      const { data: automation, error } = await supabase
        .from('marketing_automations')
        .select('total_enrolled, total_completed')
        .eq('id', automationId)
        .single();

      if (error) throw error;

      // Get status breakdown
      const { data: statusCounts } = await supabase
        .from('marketing_automation_enrollments')
        .select('status')
        .eq('automation_id', automationId);

      const counts = {
        active: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      };

      statusCounts?.forEach((enrollment: any) => {
        if (enrollment.status in counts) {
          counts[enrollment.status as keyof typeof counts]++;
        }
      });

      const total = automation.total_enrolled || 1;

      return {
        total_enrolled: automation.total_enrolled,
        active_count: counts.active,
        completed_count: counts.completed,
        completion_rate: (counts.completed / total) * 100,
        failed_count: counts.failed,
        cancelled_count: counts.cancelled,
      };
    },
    enabled: !!automationId,
  });
}
