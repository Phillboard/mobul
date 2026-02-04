/**
 * Custom Field Templates Manager
 *
 * Agency-level component for creating reusable field templates.
 * Templates can be applied to client custom field definitions.
 */

import { useState } from "react";
import { Plus, Edit, Trash2, Copy, ChevronDown, ChevronUp, Loader2, FileDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import {
  useCustomFieldTemplates,
  useCreateCustomFieldTemplate,
  useUpdateCustomFieldTemplate,
  useDeleteCustomFieldTemplate,
  useApplyTemplateToClient,
  type CustomFieldTemplate,
  type TemplateField,
} from "@/features/contacts/hooks";
import { useTenant } from "@/contexts/TenantContext";

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Dropdown (Single)" },
  { value: "multi-select", label: "Dropdown (Multiple)" },
];

const INDUSTRY_OPTIONS = [
  { value: "", label: "General (All Industries)" },
  { value: "roofing", label: "Roofing" },
  { value: "rei", label: "Real Estate Investment" },
  { value: "auto_service", label: "Auto Service" },
  { value: "auto_warranty", label: "Auto Warranty" },
  { value: "auto_buyback", label: "Auto Buy-Back" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "solar", label: "Solar" },
  { value: "insurance", label: "Insurance" },
  { value: "financial_services", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare" },
];

const EMPTY_FIELD: TemplateField = {
  field_name: "",
  field_label: "",
  field_type: "text",
  field_group: "Custom Fields",
  is_required: false,
  options: [],
};

export function CustomFieldTemplates() {
  const { currentClient } = useTenant();
  const { data: templates = [], isLoading } = useCustomFieldTemplates();
  const createMutation = useCreateCustomFieldTemplate();
  const updateMutation = useUpdateCustomFieldTemplate();
  const deleteMutation = useDeleteCustomFieldTemplate();
  const applyMutation = useApplyTemplateToClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomFieldTemplate | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateIndustry, setTemplateIndustry] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);

  // Field editor state
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState<TemplateField & { optionsText: string }>({
    ...EMPTY_FIELD,
    optionsText: "",
  });

  const handleOpenTemplateDialog = (template?: CustomFieldTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.template_name);
      setTemplateIndustry(template.industry || "");
      setFields(template.fields || []);
    } else {
      setEditingTemplate(null);
      setTemplateName("");
      setTemplateIndustry("");
      setFields([]);
    }
    setDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || fields.length === 0) return;

    const data = {
      template_name: templateName.trim(),
      industry: templateIndustry || undefined,
      fields,
    };

    if (editingTemplate) {
      await updateMutation.mutateAsync({ id: editingTemplate.id, ...data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleApplyToClient = async (template: CustomFieldTemplate) => {
    await applyMutation.mutateAsync(template);
  };

  // Field CRUD within template editor
  const handleOpenFieldDialog = (index?: number) => {
    if (index !== undefined && index < fields.length) {
      const field = fields[index];
      setEditingFieldIndex(index);
      setFieldForm({
        ...field,
        options: field.options || [],
        optionsText: field.options?.join("\n") || "",
      });
    } else {
      setEditingFieldIndex(null);
      setFieldForm({ ...EMPTY_FIELD, optionsText: "" });
    }
    setFieldDialogOpen(true);
  };

  const handleSaveField = () => {
    const options = ['select', 'multi-select'].includes(fieldForm.field_type)
      ? fieldForm.optionsText.split("\n").filter(o => o.trim())
      : [];

    const field: TemplateField = {
      field_name: fieldForm.field_name.toLowerCase().replace(/\s+/g, '_'),
      field_label: fieldForm.field_label,
      field_type: fieldForm.field_type,
      field_group: fieldForm.field_group,
      is_required: fieldForm.is_required,
      options: options.length > 0 ? options : undefined,
    };

    if (editingFieldIndex !== null) {
      const updated = [...fields];
      updated[editingFieldIndex] = field;
      setFields(updated);
    } else {
      setFields([...fields, field]);
    }
    setFieldDialogOpen(false);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const toggleExpanded = (id: string) => {
    setExpandedTemplateId(prev => prev === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Templates</CardTitle>
              <CardDescription>
                Create reusable field templates for quick client setup
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenTemplateDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No templates created yet.</p>
              <p className="text-sm mt-1">Templates let you define reusable sets of custom fields for different industries.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpanded(template.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedTemplateId === template.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{template.template_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {template.industry && (
                        <Badge variant="outline" className="capitalize">
                          {template.industry.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {currentClient && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplyToClient(template)}
                          disabled={applyMutation.isPending}
                        >
                          {applyMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <FileDown className="h-3 w-3 mr-1" />
                          )}
                          Apply to Client
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenTemplateDialog(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the "{template.template_name}" template. Fields already applied to clients will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded field list */}
                  {expandedTemplateId === template.id && (
                    <div className="px-4 pb-4 border-t">
                      <div className="pt-3 space-y-2">
                        {template.fields.map((field, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-sm">{field.field_label}</span>
                              <Badge variant="outline" className="text-xs">{field.field_type}</Badge>
                              {field.is_required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{field.field_group}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit" : "Create"} Field Template</DialogTitle>
            <DialogDescription>
              Define a reusable set of custom fields that can be applied to any client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name *</Label>
                <Input
                  id="template_name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Roofing Fields"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={templateIndustry} onValueChange={setTemplateIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value || "general"} value={opt.value || "general"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Fields list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Fields ({fields.length})</Label>
                <Button size="sm" variant="outline" onClick={() => handleOpenFieldDialog()}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                  <p className="text-sm">No fields added yet. Click "Add Field" to start.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium text-sm truncate">{field.field_label}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{field.field_type}</Badge>
                        <span className="text-xs text-muted-foreground shrink-0">{field.field_group}</span>
                        {field.is_required && <Badge variant="secondary" className="text-xs shrink-0">Required</Badge>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenFieldDialog(idx)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveField(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || fields.length === 0 || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Create/Edit Dialog (nested within template dialog) */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFieldIndex !== null ? "Edit" : "Add"} Field</DialogTitle>
            <DialogDescription>
              Configure a field for this template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field_label">Field Label *</Label>
                <Input
                  id="field_label"
                  value={fieldForm.field_label}
                  onChange={(e) => setFieldForm({ ...fieldForm, field_label: e.target.value })}
                  placeholder="e.g., Roof Age (Years)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field_name">Field Name *</Label>
                <Input
                  id="field_name"
                  value={fieldForm.field_name}
                  onChange={(e) => setFieldForm({ ...fieldForm, field_name: e.target.value })}
                  placeholder="e.g., roof_age"
                />
                <p className="text-xs text-muted-foreground">
                  Internal identifier (lowercase, no spaces)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field_type">Field Type</Label>
                <Select
                  value={fieldForm.field_type}
                  onValueChange={(value: any) => setFieldForm({ ...fieldForm, field_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="field_group">Group</Label>
                <Input
                  id="field_group"
                  value={fieldForm.field_group}
                  onChange={(e) => setFieldForm({ ...fieldForm, field_group: e.target.value })}
                  placeholder="e.g., Property Info"
                />
              </div>
            </div>

            {['select', 'multi-select'].includes(fieldForm.field_type) && (
              <div className="space-y-2">
                <Label htmlFor="options">Options (one per line)</Label>
                <Textarea
                  id="options"
                  value={fieldForm.optionsText}
                  onChange={(e) => setFieldForm({ ...fieldForm, optionsText: e.target.value })}
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  rows={4}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="field_required"
                checked={fieldForm.is_required}
                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, is_required: checked })}
              />
              <Label htmlFor="field_required">Required field</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveField}
              disabled={!fieldForm.field_label.trim() || !fieldForm.field_name.trim()}
            >
              {editingFieldIndex !== null ? "Update" : "Add"} Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
