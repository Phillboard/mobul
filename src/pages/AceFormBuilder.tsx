import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormBuilder } from "@/hooks/useFormBuilder";
import { useAceForms, useAceForm } from "@/hooks/useAceForms";
import { useTenant } from "@/contexts/TenantContext";
import { FormBuilder } from "@/components/ace-forms/FormBuilder";
import { FormTemplateSelector } from "@/components/ace-forms/FormTemplateSelector";
import { ExportDialog } from "@/components/ace-forms/ExportDialog";
import { useState } from "react";

/**
 * Ace Form Builder - Visual form editor
 */
export default function AceFormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { data: existingForm } = useAceForm(formId || "");
  const { createForm, updateForm } = useAceForms(currentClient?.id);
  const [showTemplates, setShowTemplates] = useState(!formId);
  const [showExport, setShowExport] = useState(false);
  const [formName, setFormName] = useState("");

  const {
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
  } = useFormBuilder(existingForm?.form_config);

  useEffect(() => {
    if (existingForm) {
      setConfig(existingForm.form_config);
      setFormName(existingForm.name);
    }
  }, [existingForm, setConfig]);

  const handleSave = async () => {
    if (!currentClient) return;

    const formData = {
      client_id: currentClient.id,
      name: formName || "Untitled Form",
      form_config: config,
    };

    if (formId) {
      await updateForm.mutateAsync({ id: formId, updates: formData });
    } else {
      const newForm = await createForm.mutateAsync(formData);
      navigate(`/ace-forms/${newForm.id}/edit`);
    }
  };

  if (showTemplates) {
    return (
      <FormTemplateSelector
        onSelect={(template) => {
          setConfig(template.config);
          setFormName(template.name);
          setShowTemplates(false);
        }}
        onCancel={() => navigate("/ace-forms")}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ace-forms")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Form Name"
              className="text-lg font-semibold bg-transparent border-none focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/forms/${formId}`)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          {formId && (
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              Export
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={createForm.isPending || updateForm.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {createForm.isPending || updateForm.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Builder */}
      <FormBuilder
        config={config}
        selectedFieldId={selectedFieldId}
        selectedField={selectedField}
        onSelectField={setSelectedFieldId}
        onAddField={addField}
        onUpdateField={updateField}
        onDeleteField={deleteField}
        onReorderFields={reorderFields}
        onUpdateSettings={updateSettings}
      />

      {/* Export Dialog */}
      {formId && (
        <ExportDialog
          open={showExport}
          onOpenChange={setShowExport}
          formId={formId}
          config={config}
        />
      )}
    </div>
  );
}
