import { useState, useCallback } from "react";
import { FormField, FormConfig } from "@/types/aceForms";
import { nanoid } from "nanoid";

/**
 * Hook for managing form builder state
 */
export function useFormBuilder(initialConfig?: FormConfig) {
  const [config, setConfig] = useState<FormConfig>(
    initialConfig || {
      fields: [],
      settings: {
        title: "New Form",
        submitButtonText: "Submit",
        primaryColor: "#6366f1",
      },
    }
  );

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Add a new field
  const addField = useCallback((type: FormField["type"]) => {
    const newField: FormField = {
      id: nanoid(),
      type,
      label: `New ${type} Field`,
      placeholder: "",
      required: false,
      validation: [],
    };

    setConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    setSelectedFieldId(newField.id);
  }, []);

  // Update a field
  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  }, []);

  // Delete a field
  const deleteField = useCallback((fieldId: string) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }));

    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }, [selectedFieldId]);

  // Reorder fields
  const reorderFields = useCallback((startIndex: number, endIndex: number) => {
    setConfig((prev) => {
      const newFields = [...prev.fields];
      const [removed] = newFields.splice(startIndex, 1);
      newFields.splice(endIndex, 0, removed);

      return {
        ...prev,
        fields: newFields,
      };
    });
  }, []);

  // Update form settings
  const updateSettings = useCallback((updates: Partial<FormConfig["settings"]>) => {
    setConfig((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    }));
  }, []);

  // Get selected field
  const selectedField = config.fields.find((f) => f.id === selectedFieldId);

  return {
    config,
    setConfig,
    selectedFieldId,
    setSelectedFieldId,
    selectedField,
    addField,
    updateField,
    deleteField,
    reorderFields,
    updateSettings,
  };
}
