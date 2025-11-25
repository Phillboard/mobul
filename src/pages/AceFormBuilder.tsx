import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Eye, Sparkles, ChevronRight, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormBuilderRHF } from "@/hooks/useFormBuilderRHF";
import { useAceForms, useAceForm } from "@/hooks/useAceForms";
import { useTenant } from "@/contexts/TenantContext";
import { Layout } from "@/components/layout/Layout";
import { FormBuilder } from "@/components/ace-forms/FormBuilder";
import { FormTemplateSelector } from "@/components/ace-forms/FormTemplateSelector";
import { ExportDialog } from "@/components/ace-forms/ExportDialog";
import { FormEmbedDialog } from "@/components/ace-forms/FormEmbedDialog";
import { AIFormGenerator } from "@/components/ace-forms/AIFormGenerator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const [showEmbed, setShowEmbed] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [formName, setFormName] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<number>();
  const { toast } = useToast();

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
  } = useFormBuilderRHF(existingForm?.form_config);

  useEffect(() => {
    if (existingForm) {
      setConfig(existingForm.form_config);
      setFormName(existingForm.name);
      setLastSaved(new Date(existingForm.updated_at || existingForm.created_at));
    }
  }, [existingForm, setConfig]);

  // Auto-save every 3 seconds
  const performAutoSave = useCallback(async () => {
    if (!currentClient || !formId) return;

    try {
      await updateForm.mutateAsync({
        id: formId,
        updates: {
          client_id: currentClient.id,
          name: formName || "Untitled Form",
          form_config: config,
          is_draft: true,
          last_auto_save: new Date().toISOString(),
        },
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [currentClient, formId, formName, config, updateForm]);

  useEffect(() => {
    // Only auto-save for existing forms
    if (!formId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = window.setTimeout(() => {
      performAutoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formId, config, formName, performAutoSave]);

  const handleSave = async () => {
    if (!currentClient) return;

    const formData = {
      client_id: currentClient.id,
      name: formName || "Untitled Form",
      form_config: config,
      is_draft: false, // Mark as not draft when explicitly saved
    };

    if (formId) {
      await updateForm.mutateAsync({ id: formId, updates: formData });
      toast({
        title: "Form Saved",
        description: "Your form has been saved successfully.",
      });
      return formId;
    } else {
      const newForm = await createForm.mutateAsync(formData);
      navigate(`/ace-forms/${newForm.id}/builder`);
      toast({
        title: "Form Created",
        description: "Your form has been created successfully.",
      });
      setLastSaved(new Date());
      return newForm.id;
    }
  };

  const handleAIGenerated = (name: string, description: string, aiConfig: any) => {
    setFormName(name);
    setConfig(aiConfig);
    setShowAIGenerator(false);
    toast({
      title: "AI Form Ready",
      description: "Your form has been generated. You can now customize it further.",
    });
  };

  if (showTemplates) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal"
              onClick={() => navigate("/ace-forms")}
            >
              Ace Forms
            </Button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">Create New Form</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* AI Generator */}
            <div className="border rounded-lg p-6 space-y-4 bg-card">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Generate with AI</h2>
              </div>
              <p className="text-muted-foreground">
                Describe your form and let AI create it for you in seconds.
              </p>
              <AIFormGenerator onGenerated={handleAIGenerated} />
            </div>

            {/* Template Selector */}
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Or Choose a Template</h2>
              <FormTemplateSelector
                onSelect={(template) => {
                  setConfig(template.config);
                  setFormName(template.name);
                  setShowTemplates(false);
                }}
                onCancel={() => navigate("/ace-forms")}
              />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col -m-3 md:-m-4">
        {/* Top Bar with Breadcrumbs */}
        <div className="border-b bg-background px-4 py-3 flex flex-col gap-2">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal"
              onClick={() => navigate("/ace-forms")}
            >
              Ace Forms
            </Button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">{formName || "Untitled Form"}</span>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Form Name"
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
              />
            </div>

            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowAIGenerator(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              
              {/* Preview button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  const id = formId || await handleSave();
                  if (id) {
                    window.open(`/forms/${id}`, '_blank');
                  }
                }}
                disabled={createForm.isPending || updateForm.isPending}
              >
                <Eye className="w-4 h-4 mr-2" />
                {!formId ? "Save & Preview" : "Preview"}
              </Button>

              {formId && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowEmbed(true)}>
                    <Code2 className="w-4 h-4 mr-2" />
                    Embed Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
                    Export
                  </Button>
                </>
              )}
              <Button size="sm" onClick={handleSave} disabled={createForm.isPending || updateForm.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {createForm.isPending || updateForm.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Builder */}
        <div className="flex-1 overflow-hidden">
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
        </div>
      </div>

      {/* AI Generator Dialog */}
      <Dialog open={showAIGenerator} onOpenChange={setShowAIGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Form Assistant</DialogTitle>
            <DialogDescription>
              Describe what you want to add or change, and AI will help you.
            </DialogDescription>
          </DialogHeader>
          <AIFormGenerator onGenerated={handleAIGenerated} />
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      {formId && (
        <FormEmbedDialog
          open={showEmbed}
          onOpenChange={setShowEmbed}
          formId={formId}
        />
      )}

      {/* Export Dialog */}
      {formId && (
        <ExportDialog
          open={showExport}
          onOpenChange={setShowExport}
          formId={formId}
          config={config}
        />
      )}
    </Layout>
  );
}
