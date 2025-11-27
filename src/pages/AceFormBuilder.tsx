import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Eye, Sparkles, ChevronRight, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAceForms, useAceForm } from "@/hooks/useAceForms";
import { useTenant } from "@/contexts/TenantContext";
import { Layout } from "@/components/layout/Layout";
import { FormBuilder } from "@/components/ace-forms/FormBuilder";
import { FormBuilderProvider, useFormBuilder } from "@/contexts/FormBuilderContext";
import { RevealDesigner } from "@/components/ace-forms/RevealDesigner";
import { FormAnalytics } from "@/components/ace-forms/FormAnalytics";
import { FormTemplateSelector } from "@/components/ace-forms/FormTemplateSelector";
import { ExportDialog } from "@/components/ace-forms/ExportDialog";
import { FormEmbedDialog } from "@/components/ace-forms/FormEmbedDialog";
import { AIFormGenerator } from "@/components/ace-forms/AIFormGenerator";
import { KeyboardShortcutsHelp } from "@/components/ace-forms/KeyboardShortcutsHelp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

/**
 * Inner component that uses FormBuilderContext
 */
function AceFormBuilderContent() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { createForm, updateForm } = useAceForms(currentClient?.id);
  const [showTemplates, setShowTemplates] = useState(!formId);
  const [showExport, setShowExport] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [formName, setFormName] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'reveal' | 'analytics'>('form');
  const autoSaveTimerRef = useRef<number>();
  const { toast } = useToast();

  const { config, setConfig, updateRevealSettings } = useFormBuilder();

  // Set form name from initial config
  useEffect(() => {
    if (config.settings.title && !formName) {
      setFormName(config.settings.title);
    }
  }, [config.settings.title, formName]);

  // Auto-save every 3 seconds
  const performAutoSave = useCallback(async () => {
    if (!currentClient || !formId) return;

    try {
      setIsSaving(true);
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
      toast({
        title: "Auto-save Failed",
        description: "Could not save your changes. Please try saving manually.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentClient, formId, formName, config, updateForm, toast]);

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

    setIsSaving(true);
    try {
      const formData = {
        client_id: currentClient.id,
        name: formName || "Untitled Form",
        form_config: config,
        is_draft: false, // Mark as not draft when explicitly saved
      };

      if (formId) {
        await updateForm.mutateAsync({ id: formId, updates: formData });
        toast({
          title: "✅ Saved",
          description: "Your form has been saved successfully.",
        });
        setLastSaved(new Date());
        return formId;
      } else {
        const newForm = await createForm.mutateAsync(formData);
        navigate(`/ace-forms/${newForm.id}/builder`);
        toast({
          title: "✅ Form Created",
          description: "Your form has been created successfully.",
        });
        setLastSaved(new Date());
        return newForm.id;
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save your form. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

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

  // Don't show templates selector if we have a formId
  useEffect(() => {
    if (formId) {
      setShowTemplates(false);
    }
  }, [formId]);

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
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Form Name"
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
              />
              
              {/* Tabs for Form/Reveal/Analytics */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'form' | 'reveal' | 'analytics')}>
                <TabsList>
                  <TabsTrigger value="form">Form Designer</TabsTrigger>
                  <TabsTrigger value="reveal">Reveal Designer</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-2">
              {isSaving ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : lastSaved ? (
                <span className="text-xs text-muted-foreground">
                  ✓ Saved {lastSaved.toLocaleTimeString()}
                </span>
              ) : null}
              
              <KeyboardShortcutsHelp />
              
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
                disabled={isSaving}
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
              <Button 
                size="sm" 
                onClick={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Builder */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'form' && <FormBuilder activeTab={activeTab} />}
          
          {activeTab === 'reveal' && (
            <RevealDesigner
              revealSettings={config.revealSettings}
              onUpdate={updateRevealSettings}
            />
          )}
          
          {activeTab === 'analytics' && formId && (
            <div className="p-6">
              <FormAnalytics formId={formId} />
            </div>
          )}
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

/**
 * Ace Form Builder - Visual form editor
 * Wraps the content in FormBuilderProvider for state management
 */
export default function AceFormBuilder() {
  const { formId } = useParams();
  const { data: existingForm, isLoading } = useAceForm(formId || "");

  // Show loading state while fetching existing form
  if (formId && isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading form...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <FormBuilderProvider initialConfig={existingForm?.form_config}>
      <AceFormBuilderContent />
    </FormBuilderProvider>
  );
}
