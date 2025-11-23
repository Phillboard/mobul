import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, ConditionalLogic } from "@/types/aceForms";

interface ConditionalLogicBuilderProps {
  field: FormField;
  allFields: FormField[];
  onUpdate: (conditional?: ConditionalLogic) => void;
}

export function ConditionalLogicBuilder({ field, allFields, onUpdate }: ConditionalLogicBuilderProps) {
  const [enabled, setEnabled] = useState(!!field.conditional);
  const [logic, setLogic] = useState<ConditionalLogic>(
    field.conditional || {
      showIf: {
        fieldId: "",
        operator: "equals",
        value: "",
      },
    }
  );

  const availableFields = allFields.filter((f) => f.id !== field.id);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onUpdate(undefined);
    }
  };

  const handleUpdate = (updates: Partial<ConditionalLogic["showIf"]>) => {
    const newLogic = {
      showIf: {
        ...logic.showIf,
        ...updates,
      },
    };
    setLogic(newLogic);
    onUpdate(newLogic);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Conditional Logic</CardTitle>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Enable</span>
          </label>
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Show this field when:
          </div>

          <div className="space-y-3">
            {/* Field Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Field</Label>
              <Select
                value={logic.showIf.fieldId}
                onValueChange={(value) => handleUpdate({ fieldId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Condition</Label>
              <Select
                value={logic.showIf.operator}
                onValueChange={(value: any) => handleUpdate({ operator: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">equals</SelectItem>
                  <SelectItem value="notEquals">does not equal</SelectItem>
                  <SelectItem value="contains">contains</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value Input */}
            <div className="space-y-2">
              <Label className="text-xs">Value</Label>
              <Input
                value={logic.showIf.value}
                onChange={(e) => handleUpdate({ value: e.target.value })}
                placeholder="Enter value..."
              />
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground border-t">
            This field will only appear when the selected condition is met.
          </div>
        </CardContent>
      )}
    </Card>
  );
}
