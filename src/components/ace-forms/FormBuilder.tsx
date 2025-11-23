import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormField, FormConfig, FieldType } from "@/types/aceForms";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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
  selectedField?: FormField;
  onSelectField: (id: string | null) => void;
  onAddField: (type: FieldType) => void;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onDeleteField: (id: string) => void;
  onReorderFields: (startIndex: number, endIndex: number) => void;
  onUpdateSettings: (updates: Partial<FormConfig["settings"]>) => void;
}

export function FormBuilder({
  config,
  selectedFieldId,
  selectedField,
  onSelectField,
  onAddField,
  onUpdateField,
  onDeleteField,
  onReorderFields,
  onUpdateSettings,
}: FormBuilderProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    onReorderFields(result.source.index, result.destination.index);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Field Library */}
      <div className="w-64 border-r bg-muted/50 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Add Fields</h3>
        <div className="space-y-2">
          {fieldTypes.map((field) => (
            <Button
              key={field.type}
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => onAddField(field.type)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {field.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 p-8 overflow-y-auto bg-background">
        <div className="max-w-2xl mx-auto bg-card rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-2">{config.settings?.title}</h2>
          {config.settings?.description && (
            <p className="text-muted-foreground mb-6">{config.settings.description}</p>
          )}

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="fields">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {config.fields.map((field, index) => (
                    <Draggable key={field.id} draggableId={field.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`border rounded-lg p-4 bg-background cursor-pointer transition-colors ${
                            selectedFieldId === field.id ? "border-primary ring-2 ring-primary/20" : ""
                          }`}
                          onClick={() => onSelectField(field.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div {...provided.dragHandleProps} className="mt-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <Label>
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </Label>
                              <Input
                                placeholder={field.placeholder}
                                disabled
                                className="mt-2"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteField(field.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {config.fields.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Click a field type on the left to add it to your form
            </div>
          )}

          <Button className="w-full mt-6" disabled>
            {config.settings?.submitButtonText || "Submit"}
          </Button>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 border-l bg-muted/50 p-4 overflow-y-auto">
        {selectedField ? (
          <div className="space-y-4">
            <h3 className="font-semibold">Field Properties</h3>
            <Separator />

            <div>
              <Label>Label</Label>
              <Input
                value={selectedField.label}
                onChange={(e) => onUpdateField(selectedField.id, { label: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Placeholder</Label>
              <Input
                value={selectedField.placeholder || ""}
                onChange={(e) => onUpdateField(selectedField.id, { placeholder: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Help Text</Label>
              <Input
                value={selectedField.helpText || ""}
                onChange={(e) => onUpdateField(selectedField.id, { helpText: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={selectedField.required}
                onCheckedChange={(checked) =>
                  onUpdateField(selectedField.id, { required: checked })
                }
              />
            </div>

            {(selectedField.type === "select" || selectedField.type === "radio") && (
              <div>
                <Label>Options (one per line)</Label>
                <Textarea
                  value={selectedField.options?.join("\n") || ""}
                  onChange={(e) =>
                    onUpdateField(selectedField.id, {
                      options: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  className="mt-2"
                  rows={5}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold">Form Settings</h3>
            <Separator />

            <div>
              <Label>Form Title</Label>
              <Input
                value={config.settings?.title || ""}
                onChange={(e) => onUpdateSettings({ title: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={config.settings?.description || ""}
                onChange={(e) => onUpdateSettings({ description: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Submit Button Text</Label>
              <Input
                value={config.settings?.submitButtonText || ""}
                onChange={(e) => onUpdateSettings({ submitButtonText: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Primary Color</Label>
              <Input
                type="color"
                value={config.settings?.primaryColor || "#6366f1"}
                onChange={(e) => onUpdateSettings({ primaryColor: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
