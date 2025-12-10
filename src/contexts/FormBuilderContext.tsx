import { createContext, useContext, ReactNode } from "react";
import { FormField, FormConfig, FieldType, FormSettings } from "@/types/aceForms";
import { useFormBuilderRHF } from "@/hooks/useFormBuilderRHF";
import { FieldPreset } from "@/features/ace-forms/components/FieldPresets";

interface FormBuilderContextValue {
  // State
  config: FormConfig;
  selectedFieldId: string | null;
  selectedField: FormField | undefined;
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  setConfig: (config: FormConfig) => void;
  setSelectedFieldId: (id: string | null) => void;
  addField: (type: FieldType) => void;
  addFields: (fields: Omit<FormField, "id">[]) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  duplicateField: (fieldId: string) => void;
  deleteField: (fieldId: string) => void;
  reorderFields: (startIndex: number, endIndex: number) => void;
  updateSettings: (updates: Partial<FormSettings>) => void;
  updateRevealSettings: (updates: Partial<FormConfig["revealSettings"]>) => void;
  undo: () => void;
  redo: () => void;
}

const FormBuilderContext = createContext<FormBuilderContextValue | undefined>(undefined);

interface FormBuilderProviderProps {
  children: ReactNode;
  initialConfig?: FormConfig;
}

export function FormBuilderProvider({ children, initialConfig }: FormBuilderProviderProps) {
  const formBuilder = useFormBuilderRHF(initialConfig);

  return (
    <FormBuilderContext.Provider value={formBuilder}>
      {children}
    </FormBuilderContext.Provider>
  );
}

export function useFormBuilder() {
  const context = useContext(FormBuilderContext);
  if (context === undefined) {
    throw new Error("useFormBuilder must be used within a FormBuilderProvider");
  }
  return context;
}
