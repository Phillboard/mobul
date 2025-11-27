/**
 * Form Builder Hook using React Hook Form + useFieldArray
 * Replaces custom useFormBuilder with battle-tested RHF
 */
import { useForm, useFieldArray } from "react-hook-form";
import { FormField, FormConfig, FieldType } from "@/types/aceForms";
import { nanoid } from "nanoid";
import { useState, useCallback, useEffect, useRef } from "react";
import { useUndo } from "@/hooks/useUndo";

interface FormBuilderFormData {
  fields: FormField[];
  settings: FormConfig["settings"];
  revealSettings: FormConfig["revealSettings"];
}

export function useFormBuilderRHF(initialConfig?: FormConfig) {
  const { control, watch, setValue, getValues } = useForm<FormBuilderFormData>({
    defaultValues: {
      fields: initialConfig?.fields || [],
      settings: initialConfig?.settings || {
        title: "New Form",
        submitButtonText: "Submit",
        primaryColor: "#6366f1",
      },
      revealSettings: initialConfig?.revealSettings || {
        animationStyle: 'confetti',
        showConfetti: true,
        cardStyle: 'modern',
        cardGradient: true,
        showBrandLogo: true,
        showQRCode: true,
        showOpenInApp: false,
        showShareButton: true,
        showWalletButton: true,
        showDownloadButton: true,
        showInstructions: true,
        revealBackground: 'gradient',
      },
    },
  });

  const { fields, append, remove, move, update } = useFieldArray({
    control,
    name: "fields",
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  
  // Track if we're applying undo/redo to prevent circular updates
  const isUndoRedoRef = useRef(false);

  // Undo/Redo system
  const { state: historyConfig, set: setHistory, undo, redo, canUndo, canRedo } = useUndo<FormConfig>({
    fields: initialConfig?.fields || [],
    settings: initialConfig?.settings || {
      title: "New Form",
      submitButtonText: "Submit",
      primaryColor: "#6366f1",
    },
      revealSettings: initialConfig?.revealSettings || {
        animationStyle: 'confetti',
        showConfetti: true,
        cardStyle: 'modern',
        cardGradient: true,
        showBrandLogo: true,
        showQRCode: true,
        showOpenInApp: false,
        showShareButton: true,
        showWalletButton: true,
        showDownloadButton: true,
        showInstructions: true,
        revealBackground: 'gradient',
      },
  });

  // Watch form data
  const formData = watch();
  const config: FormConfig = {
    fields: formData.fields,
    settings: formData.settings,
    revealSettings: formData.revealSettings,
  };

  // Track changes for undo/redo
  const trackChange = useCallback(() => {
    const currentConfig = getValues();
    setHistory({
      fields: currentConfig.fields,
      settings: currentConfig.settings,
      revealSettings: currentConfig.revealSettings,
    });
  }, [getValues, setHistory]);

  // Add a new field
  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: nanoid(),
      type,
      label: `New ${type} Field`,
      placeholder: "",
      required: false,
      validation: [],
    };

    append(newField);
    setSelectedFieldId(newField.id);
    trackChange();
  };

  // Add multiple fields (for presets)
  const addFields = (fieldsToAdd: Omit<FormField, "id">[]) => {
    const newFields = fieldsToAdd.map(field => ({
      ...field,
      id: nanoid(),
    }));
    
    newFields.forEach(field => append(field));
    if (newFields.length > 0) {
      setSelectedFieldId(newFields[0].id);
    }
    trackChange();
  };

  // Update a field
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex !== -1) {
      update(fieldIndex, { ...fields[fieldIndex], ...updates });
      trackChange();
    }
  };

  // Duplicate a field
  const duplicateField = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      const newField = {
        ...field,
        id: nanoid(),
        label: `${field.label} (Copy)`,
      };
      const fieldIndex = fields.findIndex((f) => f.id === fieldId);
      append(newField);
      setSelectedFieldId(newField.id);
      trackChange();
    }
  };

  // Delete a field
  const deleteField = (fieldId: string) => {
    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex !== -1) {
      remove(fieldIndex);
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
      trackChange();
    }
  };

  // Reorder fields (using RHF's move function)
  const reorderFields = (startIndex: number, endIndex: number) => {
    move(startIndex, endIndex);
    trackChange();
  };

  // Update form settings
  const updateSettings = (updates: Partial<FormConfig["settings"]>) => {
    setValue("settings", {
      ...formData.settings,
      ...updates,
    });
    trackChange();
  };

  // Update reveal settings
  const updateRevealSettings = (updates: Partial<FormConfig["revealSettings"]>) => {
    setValue("revealSettings", {
      ...formData.revealSettings,
      ...updates,
    });
    trackChange();
  };

  // Set entire config (for loading saved forms)
  const setConfig = (newConfig: FormConfig) => {
    setValue("fields", newConfig.fields);
    setValue("settings", newConfig.settings);
    if (newConfig.revealSettings) {
      setValue("revealSettings", newConfig.revealSettings);
    }
  };

  // Get selected field
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Sync history state to RHF ONLY when undo/redo is triggered
  useEffect(() => {
    if (isUndoRedoRef.current) {
      setValue("fields", historyConfig.fields, { shouldValidate: false });
      setValue("settings", historyConfig.settings, { shouldValidate: false });
      if (historyConfig.revealSettings) {
        setValue("revealSettings", historyConfig.revealSettings, { shouldValidate: false });
      }
      isUndoRedoRef.current = false; // Reset flag after sync
    }
  }, [historyConfig, setValue]);

  // Handle undo/redo - set flag and trigger history update
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedoRef.current = true;
    undo();
  }, [undo, canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedoRef.current = true;
    redo();
  }, [redo, canRedo]);

  return {
    config,
    setConfig,
    selectedFieldId,
    setSelectedFieldId,
    selectedField,
    addField,
    addFields,
    updateField,
    duplicateField,
    deleteField,
    reorderFields,
    updateSettings,
    updateRevealSettings,
    // Undo/Redo
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    // Expose RHF control for advanced usage
    control,
  };
}
