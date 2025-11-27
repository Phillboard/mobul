import { useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FieldType } from "@/types/aceForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, GripVertical, Settings, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConditionalLogicBuilder } from "./ConditionalLogicBuilder";
import { SmartFieldSuggestions } from "./SmartFieldSuggestions";
import { RevealDesigner } from "./RevealDesigner";
import { ValidationRulesEditor } from "./ValidationRulesEditor";
import { FieldStylingEditor } from "./FieldStylingEditor";
import { FieldPresets, type FieldPreset } from "./FieldPresets";
import { FormBuilderMobile } from "./FormBuilderMobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormBuilder } from "@/contexts/FormBuilderContext";
import { useToast } from "@/hooks/use-toast";

const fieldTypes: { type: FieldType; label: string }[] = [
  { type: "gift-card-code", label: "Gift Card Code" },
  { type: "text", label: "Text Input" },
  { type: "email", label: "Email" },
  { type: "phone", label: "Phone" },
  { type: "textarea", label: "Text Area" },
  { type: "select", label: "Dropdown" },
  { type: "checkbox", label: "Checkbox" },
  { type: "radio", label: "Radio Group" },
  { type: "date", label: "Date Picker" },
];

interface FormBuilderProps {
  activeTab?: "form" | "reveal";
}

export function FormBuilder({ activeTab = "form" }: FormBuilderProps) {
  const {
    config,
    selectedField,
    selectedFieldId,
    addField,
    addFields,
    updateField,
    duplicateField,
    deleteField,
    reorderFields,
    setSelectedFieldId,
    updateSettings,
    updateRevealSettings,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFormBuilder();
  const { toast } = useToast();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderFields(result.source.index, result.destination.index);
  };

  const handleAddFieldPreset = (preset: FieldPreset) => {
    addFields(preset.fields);
  };

  // Keyboard shortcuts for form builder
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key to remove selected field
      if (e.key === 'Delete' && selectedFieldId && activeTab === 'form') {
        e.preventDefault();
        deleteField(selectedFieldId);
        toast({
          title: "Field Deleted",
          description: "The selected field has been removed.",
        });
      }
      
      // Ctrl+Z or Cmd+Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
        toast({
          title: "↶ Undone",
          description: "Your last change has been undone.",
        });
      }
      
      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y to redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        if (canRedo) {
          e.preventDefault();
          redo();
          toast({
            title: "↷ Redone",
            description: "Your change has been redone.",
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, activeTab, deleteField, undo, redo, canUndo, canRedo, toast]);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile Add Field Button */}
      <FormBuilderMobile onAddField={addField} />

      {/* Left Sidebar - Field Library - Hidden on mobile */}
      <ScrollArea className="hidden lg:block w-64 border-r bg-muted/30 p-4">
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Field Types</h3>
            <div className="space-y-2">
              {fieldTypes.map((field) => (
                <Button
                  key={field.type}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => addField(field.type)}
                >
                  {field.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Field Presets */}
          <FieldPresets onAddPreset={handleAddFieldPreset} />
        </div>
      </ScrollArea>

      {/* Center - Form Canvas */}
      <ScrollArea className="flex-1 p-4 lg:p-6 bg-background">
        {activeTab === "reveal" && config.revealSettings ? (
          <RevealDesigner
            revealSettings={config.revealSettings}
            onUpdate={updateRevealSettings}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">{config.settings.title}</h2>
              {config.settings.description && (
                <p className="text-muted-foreground mt-2">{config.settings.description}</p>
              )}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="form-fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {config.fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${
                              selectedField?.id === field.id
                                ? "ring-2 ring-primary"
                                : "hover:border-primary/50"
                            } ${snapshot.isDragging ? "shadow-lg" : ""} transition-all cursor-pointer`}
                            onClick={() => setSelectedFieldId(field.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing pt-2"
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <Label>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                  </Label>
                                  {field.helpText && (
                                    <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                                  )}
                                  <div className="mt-2">
                                    {field.type === "textarea" ? (
                                      <Textarea placeholder={field.placeholder} disabled />
                                    ) : field.type === "select" ? (
                                      <Select disabled>
                                        <SelectTrigger>
                                          <SelectValue placeholder={field.placeholder || "Select..."} />
                                        </SelectTrigger>
                                      </Select>
                                    ) : (
                                      <Input
                                        type={field.type === "email" ? "email" : "text"}
                                        placeholder={field.placeholder}
                                        disabled
                                      />
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      duplicateField(field.id);
                                    }}
                                    title="Duplicate field"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteField(field.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {config.fields.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No fields yet. Add fields from the library on the left.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Right Sidebar - Properties - Hidden on mobile */}
      <ScrollArea className="hidden lg:block w-80 border-l bg-muted/30 p-4">
        {selectedField ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Field Properties</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFieldId(null)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            {/* Smart Suggestions */}
            <SmartFieldSuggestions
              field={selectedField}
              onApplySuggestion={(updates) => updateField(selectedField.id, updates)}
            />

            {/* Basic Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Basic</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    value={selectedField.placeholder || ""}
                    onChange={(e) =>
                      updateField(selectedField.id, { placeholder: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Help Text</Label>
                  <Input
                    value={selectedField.helpText || ""}
                    onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Required</Label>
                  <Switch
                    checked={selectedField.required}
                    onCheckedChange={(checked) =>
                      updateField(selectedField.id, { required: checked })
                    }
                  />
                </div>

                {(selectedField.type === "select" ||
                  selectedField.type === "radio" ||
                  selectedField.type === "checkbox") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Options (one per line)</Label>
                    <Textarea
                      value={selectedField.options?.join("\n") || ""}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          options: e.target.value.split("\n").filter((o) => o.trim()),
                        })
                      }
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation Rules */}
            <ValidationRulesEditor
              rules={selectedField.validation || []}
              onUpdate={(rules) => updateField(selectedField.id, { validation: rules })}
            />

            {/* Field Styling */}
            <FieldStylingEditor
              styling={selectedField.styling}
              onUpdate={(styling) => updateField(selectedField.id, { styling })}
            />

            {/* Conditional Logic */}
            <ConditionalLogicBuilder
              field={selectedField}
              allFields={config.fields}
              onUpdate={(conditional) => updateField(selectedField.id, { conditional })}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium mb-4">Form Settings</h3>

            {/* Form Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Form Title</Label>
                  <Input
                    value={config.settings.title}
                    onChange={(e) => updateSettings({ title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={config.settings.description || ""}
                    onChange={(e) => updateSettings({ description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Submit Button Text</Label>
                  <Input
                    value={config.settings.submitButtonText}
                    onChange={(e) => updateSettings({ submitButtonText: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.settings.primaryColor}
                      onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                      className="w-16 h-9 p-1"
                    />
                    <Input
                      value={config.settings.primaryColor}
                      onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Success Message</Label>
                  <Textarea
                    value={config.settings.successMessage || ""}
                    onChange={(e) => updateSettings({ successMessage: e.target.value })}
                    placeholder="Thank you for your submission!"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
