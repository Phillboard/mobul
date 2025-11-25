import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TablePreferences {
  visible_columns: string[];
  column_order: string[];
  column_widths: Record<string, number>;
}

const DEFAULT_CONTACT_COLUMNS = [
  "customer_code",
  "name",
  "email",
  "phone",
  "company",
  "lifecycle_stage",
  "lead_score",
  "engagement_score",
  "last_activity_date",
];

export function useTablePreferences(tableName: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["table-preferences", user?.id, tableName],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_table_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("table_name", tableName)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      // Parse JSON fields to proper types
      if (data) {
        return {
          visible_columns: Array.isArray(data.visible_columns) ? data.visible_columns as string[] : DEFAULT_CONTACT_COLUMNS,
          column_order: Array.isArray(data.column_order) ? data.column_order as string[] : DEFAULT_CONTACT_COLUMNS,
          column_widths: (data.column_widths && typeof data.column_widths === 'object') ? data.column_widths as Record<string, number> : {},
        };
      }
      
      return null;
    },
    enabled: !!user?.id,
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: Partial<TablePreferences>) => {
      if (!user?.id) throw new Error("No user");

      const currentPrefs = preferences || {
        visible_columns: DEFAULT_CONTACT_COLUMNS,
        column_order: DEFAULT_CONTACT_COLUMNS,
        column_widths: {},
      };

      const { data, error } = await supabase
        .from("user_table_preferences")
        .upsert({
          user_id: user.id,
          table_name: tableName,
          visible_columns: newPreferences.visible_columns ?? currentPrefs.visible_columns,
          column_order: newPreferences.column_order ?? currentPrefs.column_order,
          column_widths: newPreferences.column_widths ?? currentPrefs.column_widths,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newPreferences) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["table-preferences", user?.id, tableName] });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<TablePreferences>(
        ["table-preferences", user?.id, tableName]
      );

      // Optimistically update
      const currentPrefs = preferences || {
        visible_columns: DEFAULT_CONTACT_COLUMNS,
        column_order: DEFAULT_CONTACT_COLUMNS,
        column_widths: {},
      };

      queryClient.setQueryData(
        ["table-preferences", user?.id, tableName],
        {
          ...currentPrefs,
          ...newPreferences,
        }
      );

      return { previousPreferences };
    },
    onError: (err, newPreferences, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(
          ["table-preferences", user?.id, tableName],
          context.previousPreferences
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["table-preferences", user?.id, tableName] });
    },
  });

  const resetToDefault = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { error } = await supabase
        .from("user_table_preferences")
        .delete()
        .eq("user_id", user.id)
        .eq("table_name", tableName);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-preferences", user?.id, tableName] });
    },
  });

  return {
    preferences: preferences || {
      visible_columns: DEFAULT_CONTACT_COLUMNS,
      column_order: DEFAULT_CONTACT_COLUMNS,
      column_widths: {},
    },
    isLoading,
    updatePreferences: updatePreferences.mutate,
    resetToDefault: resetToDefault.mutate,
  };
}
