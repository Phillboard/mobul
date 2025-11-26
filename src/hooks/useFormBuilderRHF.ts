/**
 * Form Builder Hook using React Hook Form + useFieldArray
 * Replaces custom useFormBuilder with battle-tested RHF
 */
import { useForm, useFieldArray } from "react-hook-form";
import { FormField, FormConfig, FieldType } from "@/types/aceForms";
import { nanoid } from "nanoid";
import { useState } from "react";

interface FormBuilderFormData {
  fields: FormField[];
  settings: FormConfig["settings"];
  revealSettings: FormConfig["revealSettings"];
}

export function useFormBuilderRHF(initialConfig?: FormConfig) {
  const { control, watch, setValue } = useForm<FormBuilderFormData>({
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
        showOpenInApp: true,
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

  // Watch form data
  const formData = watch();
  const config: FormConfig = {
    fields: formData.fields,
    settings: formData.settings,
    revealSettings: formData.revealSettings,
  };

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
  };

  // Update a field
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const fieldIndex = fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex !== -1) {
      update(fieldIndex, { ...fields[fieldIndex], ...updates });
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
    }
  };

  // Reorder fields (using RHF's move function)
  const reorderFields = (startIndex: number, endIndex: number) => {
    move(startIndex, endIndex);
  };

  // Update form settings
  const updateSettings = (updates: Partial<FormConfig["settings"]>) => {
    setValue("settings", {
      ...formData.settings,
      ...updates,
    });
  };

  // Update reveal settings
  const updateRevealSettings = (updates: Partial<FormConfig["revealSettings"]>) => {
    setValue("revealSettings", {
      ...formData.revealSettings,
      ...updates,
    } as any);
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
    updateRevealSettings,
    // Expose RHF control for advanced usage
    control,
  };
}
