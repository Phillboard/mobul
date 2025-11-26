import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FormField, FormConfig, FieldType, FormSettings } from "@/types/aceForms";
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
import { FieldPresets, FIELD_PRESETS, type FieldPreset } from "./FieldPresets";
import { FormBuilderMobile } from "./FormBuilderMobile";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  config: FormConfig;
  selectedFieldId: string | null;
  selectedField: FormField | undefined;
  onAddField: (type: FieldType) => void;
  onAddFieldPreset: (preset: FieldPreset) => void;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onDuplicateField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onReorderFields: (startIndex: number, endIndex: number) => void;
  onSelectField: (id: string | null) => void;
  onUpdateSettings: (updates: Partial<FormSettings>) => void;
  onUpdateRevealSettings?: (updates: Partial<FormConfig["revealSettings"]>) => void;
  activeTab?: "form" | "reveal";
}

export function FormBuilder({
  config,
  selectedField,
  onAddField,
  onAddFieldPreset,
  onUpdateField,
  onDuplicateField,
  onDeleteField,
  onReorderFields,
  onSelectField,
  onUpdateSettings,
  onUpdateRevealSettings,
  activeTab = "form",
}: FormBuilderProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    onReorderFields(result.source.index, result.destination.index);
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Mobile Add Field Button */}
      <FormBuilderMobile onAddField={onAddField} />

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
                  onClick={() => onAddField(field.type)}
                >
                  {field.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Field Presets */}
          <FieldPresets onAddPreset={(preset) => onAddFieldPreset(preset)} />
        </div>
      </ScrollArea>

      {/* Center - Form Canvas */}
      <ScrollArea className="flex-1 p-4 lg:p-6 bg-background">
        {activeTab === "reveal" && onUpdateRevealSettings && config.revealSettings ? (
          <RevealDesigner
            revealSettings={config.revealSettings}
            onUpdate={onUpdateRevealSettings}
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
                            onClick={() => onSelectField(field.id)}
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
                                      onDuplicateField(field.id);
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
                                      onDeleteField(field.id);
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
                onClick={() => onSelectField(null)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            {/* Smart Suggestions */}
            <SmartFieldSuggestions
              field={selectedField}
              onApplySuggestion={(updates) => onUpdateField(selectedField.id, updates)}
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
                    onChange={(e) => onUpdateField(selectedField.id, { label: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    value={selectedField.placeholder || ""}
                    onChange={(e) =>
                      onUpdateField(selectedField.id, { placeholder: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Help Text</Label>
                  <Input
                    value={selectedField.helpText || ""}
                    onChange={(e) => onUpdateField(selectedField.id, { helpText: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Required</Label>
                  <Switch
                    checked={selectedField.required}
                    onCheckedChange={(checked) =>
                      onUpdateField(selectedField.id, { required: checked })
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
                        onUpdateField(selectedField.id, {
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
              onUpdate={(rules) => onUpdateField(selectedField.id, { validation: rules })}
            />

            {/* Field Styling */}
            <FieldStylingEditor
              styling={selectedField.styling}
              onUpdate={(styling) => onUpdateField(selectedField.id, { styling })}
            />

            {/* Conditional Logic */}
            <ConditionalLogicBuilder
              field={selectedField}
              allFields={config.fields}
              onUpdate={(conditional) => onUpdateField(selectedField.id, { conditional })}
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
                    onChange={(e) => onUpdateSettings({ title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={config.settings.description || ""}
                    onChange={(e) => onUpdateSettings({ description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Submit Button Text</Label>
                  <Input
                    value={config.settings.submitButtonText}
                    onChange={(e) => onUpdateSettings({ submitButtonText: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.settings.primaryColor}
                      onChange={(e) => onUpdateSettings({ primaryColor: e.target.value })}
                      className="w-16 h-9 p-1"
                    />
                    <Input
                      value={config.settings.primaryColor}
                      onChange={(e) => onUpdateSettings({ primaryColor: e.target.value })}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Success Message</Label>
                  <Textarea
                    value={config.settings.successMessage || ""}
                    onChange={(e) => onUpdateSettings({ successMessage: e.target.value })}
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
