import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FormConfig } from "@/types/aceForms";

interface UseFormPersistenceProps {
  formId: string;
  config: FormConfig;
  clientId: string;
  formName: string;
}

export function useFormPersistence({ formId, config, clientId, formName }: UseFormPersistenceProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout>();
  const configRef = useRef(config);

  // Update ref when config changes
  useEffect(() => {
    configRef.current = config;
    setSaveStatus("unsaved");
    
    // Debounce auto-save
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    
    autoSaveTimeout.current = setTimeout(() => {
      autoSave();
    }, 3000); // 3 second debounce

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [config]);

  // Save form mutation
  const saveMutation = useMutation({
    mutationFn: async ({ isDraft }: { isDraft: boolean }) => {
      const { data, error } = await supabase
        .from("ace_forms")
        .update({
          name: formName,
          form_config: configRef.current as any,
          is_draft: isDraft,
          last_auto_save: new Date().toISOString(),
        })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: (data) => {
      setSaveStatus("saved");
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["ace-form", formId] });
      queryClient.invalidateQueries({ queryKey: ["ace-forms"] });
    },
    onError: (error: Error) => {
      setSaveStatus("unsaved");
      console.error("Save error:", error);
    },
  });

  // Publish form mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("ace_forms")
        .update({
          name: formName,
          form_config: configRef.current as any,
          is_active: true,
          is_draft: false,
          last_auto_save: new Date().toISOString(),
        })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["ace-form", formId] });
      queryClient.invalidateQueries({ queryKey: ["ace-forms"] });
      toast({
        title: "Form Published",
        description: "Your form is now live and accepting submissions",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Publish Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unpublish form
  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("ace_forms")
        .update({
          is_active: false,
        })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ace-form", formId] });
      queryClient.invalidateQueries({ queryKey: ["ace-forms"] });
      toast({
        title: "Form Unpublished",
        description: "Your form is no longer accepting submissions",
      });
    },
  });

  const autoSave = () => {
    saveMutation.mutate({ isDraft: true });
  };

  const saveDraft = () => {
    saveMutation.mutate({ isDraft: true });
    toast({
      title: "Draft Saved",
      description: "Your changes have been saved",
    });
  };

  const publish = () => {
    publishMutation.mutate();
  };

  const unpublish = () => {
    unpublishMutation.mutate();
  };

  return {
    saveStatus,
    lastSaved,
    saveDraft,
    publish,
    unpublish,
    isPublishing: publishMutation.isPending,
    isUnpublishing: unpublishMutation.isPending,
  };
}
