import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, Eye, Sparkles, ChevronRight, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAceForms, useAceForm } from "@/hooks/useAceForms";
import { useTenant } from "@/contexts/TenantContext";
import { Layout } from "@/components/layout/Layout";
import { 
  FormBuilder,
  RevealDesigner,
  FormAnalytics,
  FormTemplateSelector,
  ExportDialog,
  FormEmbedDialog,
  AIFormGenerator,
  KeyboardShortcutsHelp 
} from "@/features/ace-forms/components";
import { FormBuilderProvider, useFormBuilder } from "@/contexts/FormBuilderContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

/**
 * Template Selection Screen
 */
function TemplateSelectionScreen({ 
  onTemplateSelected,
  onAIGenerated 
}: { 
  onTemplateSelected: (name: string, config: any) => void;
  onAIGenerated: (name: string, description: string, config: any) => void;
}) {
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);

  if (showAI) {
    return (
      <Layout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal"
              onClick={() => navigate("/ace-forms")}
            >
              Ace Forms
            </Button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">Generate with AI</span>
          </div>
          
          <AIFormGenerator onGenerated={onAIGenerated} />
        </div>
      </Layout>
    );
  }

  if (showTemplates) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal"
              onClick={() => navigate("/ace-forms")}
            >
              Ace Forms
            </Button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">Choose Template</span>
          </div>

          <FormTemplateSelector
            onSelect={(template) => {
              onTemplateSelected(template.name, template.config);
            }}
            onCancel={() => navigate("/ace-forms")}
          />
        </div>
      </Layout>
    );
  }

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
            <Button onClick={() => setShowAI(true)} size="lg" className="w-full">
              <Sparkles className="w-4 w-4 mr-2" />
              Start with AI
            </Button>
          </div>

          {/* Templates */}
          <div className="border rounded-lg p-6 space-y-4 bg-card">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Choose a Template</h2>
            </div>
            <p className="text-muted-foreground">
              Start with a pre-built template and customize it to your needs.
            </p>
            <Button onClick={() => setShowTemplates(true)} variant="outline" size="lg" className="w-full">
              <Code2 className="w-4 h-4 mr-2" />
              Browse Templates
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Inner component that uses FormBuilderContext
 */
function AceFormBuilderContent() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { createForm, updateForm } = useAceForms(currentClient?.id);
  const [showExport, setShowExport] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [formName, setFormName] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'reveal' | 'analytics'>('form');
  const autoSaveTimerRef = useRef<number>();
  const lastSavedConfigRef = useRef<string>("");
  const { toast } = useToast();

  const { config, setConfig, updateRevealSettings } = useFormBuilder();

  // Set form name from initial config
  useEffect(() => {
    if (config.settings.title && !formName) {
      setFormName(config.settings.title);
    }
  }, [config.settings.title, formName]);

  // Auto-save every 3 seconds - only if config actually changed
  const performAutoSave = useCallback(async () => {
    if (!currentClient || !formId) return;

    // Compare with last saved config using JSON to detect real changes
    const currentConfigJson = JSON.stringify(config);
    if (currentConfigJson === lastSavedConfigRef.current) {
      return; // No changes, skip save
    }

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
        silent: true, // Skip toast for auto-saves
      });
      lastSavedConfigRef.current = currentConfigJson;
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentClient, formId, formName, config, updateForm]);

  // Trigger auto-save when config changes
  useEffect(() => {
    // Only auto-save for existing forms
    if (!formId) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer - use JSON comparison inside performAutoSave
    autoSaveTimerRef.current = window.setTimeout(() => {
      performAutoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formId, config, formName]); // Keep dependencies, but performAutoSave handles comparison

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
        const result = await updateForm.mutateAsync({ id: formId, updates: formData, silent: false });
        // Update last saved ref to prevent immediate auto-save
        lastSavedConfigRef.current = JSON.stringify(config);
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
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(!formId);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const { data: existingForm, isLoading } = useAceForm(formId || "");

  // Show template selection for new forms (before FormBuilderProvider)
  if (!formId && showTemplates && !formConfig) {
    return (
      <TemplateSelectionScreen
        onTemplateSelected={(name, config) => {
          setFormName(name);
          setFormConfig(config);
          setShowTemplates(false);
        }}
        onAIGenerated={(name, _description, config) => {
          setFormName(name);
          setFormConfig(config);
          setShowTemplates(false);
        }}
      />
    );
  }

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

  // Use the generated config or the existing form config
  const initialConfig = formConfig || existingForm?.form_config;

  return (
    <FormBuilderProvider initialConfig={initialConfig}>
      <AceFormBuilderContent />
    </FormBuilderProvider>
  );
}
