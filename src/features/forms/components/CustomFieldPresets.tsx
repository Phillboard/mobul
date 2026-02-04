/**
 * Custom Field Presets for ACE Forms Builder
 *
 * Dynamically loads the client's custom field definitions and presents them
 * as individual fields or grouped presets that can be added to a form.
 * Each field is tagged with metadata linking it back to the definition.
 */

import { Button } from "@/shared/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { ListChecks, Plus } from "lucide-react";
import { useCustomFieldDefinitions, type CustomFieldDefinition } from "@/features/contacts/hooks";
import type { FormField, FieldType } from "@/types/aceForms";
import type { FieldPreset } from "./FieldPresets";

/** Map a custom field definition's type to a FormField type */
function mapFieldType(cfType: CustomFieldDefinition['field_type']): FieldType {
  switch (cfType) {
    case 'text':
    case 'url':
      return 'text';
    case 'email':
      return 'email';
    case 'number':
      return 'text'; // Number rendered as text input with pattern
    case 'date':
      return 'date';
    case 'boolean':
      return 'checkbox';
    case 'select':
      return 'select';
    case 'multi-select':
      return 'checkbox'; // Multi-select rendered as checkbox group
    default:
      return 'text';
  }
}

/** Convert a custom field definition to a FormField (without id — added by form builder) */
function customFieldToFormField(def: CustomFieldDefinition): Omit<FormField, 'id'> {
  const field: Omit<FormField, 'id'> = {
    type: mapFieldType(def.field_type),
    label: def.field_label,
    required: def.is_required,
    validation: [],
    metadata: {
      isCustomField: true,
      definitionId: def.id,
      fieldName: def.field_name,
    },
  };

  // Add options for select/multi-select
  if ((def.field_type === 'select' || def.field_type === 'multi-select') && def.options?.length) {
    field.options = def.options;
  }

  // Add placeholder hints
  if (def.field_type === 'number') {
    field.placeholder = 'Enter a number';
  } else if (def.field_type === 'url') {
    field.placeholder = 'https://...';
  }

  return field;
}

interface CustomFieldPresetsProps {
  onAddField: (field: Omit<FormField, 'id'>) => void;
  onAddPreset: (preset: FieldPreset) => void;
}

export function CustomFieldPresets({ onAddField, onAddPreset }: CustomFieldPresetsProps) {
  const { data: customFields = [], isLoading } = useCustomFieldDefinitions();

  if (isLoading || customFields.length === 0) {
    return null; // Don't show section if no custom fields defined
  }

  // Group fields by field_group
  const fieldsByGroup = customFields.reduce<Record<string, CustomFieldDefinition[]>>((acc, field) => {
    const group = field.field_group || "Custom Fields";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  const groupEntries = Object.entries(fieldsByGroup);

  const handleAddGroup = (groupName: string, groupFields: CustomFieldDefinition[]) => {
    onAddPreset({
      name: groupName,
      description: `${groupFields.length} custom field${groupFields.length !== 1 ? 's' : ''}`,
      icon: <ListChecks className="w-4 h-4" />,
      fields: groupFields.map(customFieldToFormField),
    });
  };

  const handleAddAll = () => {
    onAddPreset({
      name: "All Custom Fields",
      description: `${customFields.length} fields`,
      icon: <ListChecks className="w-4 h-4" />,
      fields: customFields.map(customFieldToFormField),
    });
  };

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium mb-1">Custom Fields</h3>
          <p className="text-xs text-muted-foreground">
            Fields defined for your client
          </p>
        </div>
        {customFields.length > 1 && (
          <Button size="sm" variant="ghost" onClick={handleAddAll} className="text-xs h-7">
            Add All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {/* Group presets — add all fields in a group at once */}
        {groupEntries.length > 1 && groupEntries.map(([groupName, groupFields]) => (
          <Card key={groupName} className="hover:border-primary/50 transition-colors">
            <CardHeader className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-violet-500/10 text-violet-600 shrink-0">
                    <ListChecks className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{groupName}</CardTitle>
                    <CardDescription className="text-xs">
                      {groupFields.length} field{groupFields.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddGroup(groupName, groupFields)}
                >
                  Add
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}

        {/* Individual custom fields */}
        {customFields.map((def) => (
          <Button
            key={def.id}
            variant="outline"
            className="w-full justify-between text-left h-auto py-2"
            onClick={() => onAddField(customFieldToFormField(def))}
          >
            <span className="truncate text-sm">{def.field_label}</span>
            <Badge variant="outline" className="text-xs ml-2 shrink-0">
              {def.field_type}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
