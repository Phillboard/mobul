import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DASHBOARD_WIDGETS, DEFAULT_WIDGET_LAYOUT } from '@/config/dashboardWidgets';
import { toast } from 'sonner';

interface DashboardPreferences {
  widget_layout: string[];
  hidden_widgets: string[];
}

export function useDashboardPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['dashboard-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_dashboard_preferences')
        .select('widget_layout, hidden_widgets')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no preferences exist
      if (!data) {
        return {
          widget_layout: DEFAULT_WIDGET_LAYOUT,
          hidden_widgets: [],
        } as DashboardPreferences;
      }

      return data as DashboardPreferences;
    },
    enabled: !!user?.id,
  });

  // Save preferences
  const saveMutation = useMutation({
    mutationFn: async (prefs: Partial<DashboardPreferences>) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('user_dashboard_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] });
      toast.success('Dashboard preferences saved');
    },
    onError: (error) => {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save dashboard preferences');
    },
  });

  // Reset to defaults
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('user_dashboard_preferences')
        .upsert({
          user_id: user.id,
          widget_layout: DEFAULT_WIDGET_LAYOUT,
          hidden_widgets: [],
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] });
      toast.success('Dashboard reset to defaults');
    },
  });

  const saveLayout = (layout: string[]) => {
    saveMutation.mutate({ widget_layout: layout });
  };

  const toggleWidget = (widgetId: string) => {
    const currentHidden = preferences?.hidden_widgets || [];
    const newHidden = currentHidden.includes(widgetId)
      ? currentHidden.filter(id => id !== widgetId)
      : [...currentHidden, widgetId];

    saveMutation.mutate({ hidden_widgets: newHidden });
  };

  const resetToDefaults = () => {
    resetMutation.mutate();
  };

  const visibleWidgets = DASHBOARD_WIDGETS.filter(
    w => !preferences?.hidden_widgets?.includes(w.id)
  );

  const layout = preferences?.widget_layout || DEFAULT_WIDGET_LAYOUT;

  return {
    preferences,
    isLoading,
    visibleWidgets,
    layout,
    hiddenWidgets: preferences?.hidden_widgets || [],
    saveLayout,
    toggleWidget,
    resetToDefaults,
    isSaving: saveMutation.isPending,
  };
}
