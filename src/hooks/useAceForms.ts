import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AceForm, FormConfig } from "@/types/aceForms";

/**
 * Hook for managing Ace Forms CRUD operations
 */
export function useAceForms(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all forms for a client
  const { data: forms, isLoading } = useQuery({
    queryKey: ["ace-forms", clientId],
    queryFn: async () => {
      let query = supabase
        .from("ace_forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data?.map(form => ({
        ...form,
        form_config: form.form_config as unknown as FormConfig
      })) as AceForm[];
    },
    enabled: !!clientId,
  });

  // Create new form
  const createForm = useMutation({
    mutationFn: async (form: Partial<AceForm>) => {
      const insertData: any = {
        client_id: form.client_id,
        name: form.name,
        description: form.description,
        form_config: form.form_config,
        template_id: form.template_id,
        is_active: form.is_active,
      };
      
      const { data, error } = await supabase
        .from("ace_forms")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ace-forms"] });
      toast({
        title: "Form Created",
        description: "Your form has been created successfully",
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

  // Update form
  const updateForm = useMutation({
    mutationFn: async ({ id, updates, silent }: { id: string; updates: Partial<AceForm>; silent?: boolean }) => {
      const { data, error } = await supabase
        .from("ace_forms")
        .update({
          ...updates,
          form_config: updates.form_config as any
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, silent };
    },
    onSuccess: (result) => {
      // Only invalidate the list, not the current form being edited
      queryClient.invalidateQueries({ queryKey: ["ace-forms"], exact: true });
      
      // Skip toast for silent auto-saves
      if (!result.silent) {
        toast({
          title: "Form Updated",
          description: "Your changes have been saved",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete form
  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ace_forms")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ace-forms"] });
      toast({
        title: "Form Deleted",
        description: "The form has been removed",
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

  // Duplicate form
  const duplicateForm = useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await supabase
        .from("ace_forms")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const duplicate = {
        ...original,
        id: undefined,
        name: `${original.name} (Copy)`,
        total_submissions: 0,
        total_views: 0,
        created_at: undefined,
        updated_at: undefined,
      };

      const { data, error } = await supabase
        .from("ace_forms")
        .insert(duplicate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ace-forms"] });
      toast({
        title: "Form Duplicated",
        description: "A copy of the form has been created",
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

  return {
    forms,
    isLoading,
    createForm,
    updateForm,
    deleteForm,
    duplicateForm,
  };
}

// Hook for getting a single form
export function useAceForm(formId: string) {
  return useQuery({
    queryKey: ["ace-form", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ace_forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (error) throw error;
      return {
        ...data,
        form_config: data.form_config as unknown as FormConfig
      } as AceForm;
    },
    enabled: !!formId,
  });
}

// Hook for form submissions
export function useFormSubmissions(formId: string) {
  return useQuery({
    queryKey: ["form-submissions", formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ace_form_submissions")
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!formId,
  });
}
