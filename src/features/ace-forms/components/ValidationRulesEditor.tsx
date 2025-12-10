import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ValidationRule } from "@/types/aceForms";

interface ValidationRulesEditorProps {
  rules: ValidationRule[];
  onUpdate: (rules: ValidationRule[]) => void;
}

const VALIDATION_PRESETS: Record<string, { pattern: string; message: string }> = {
  email: {
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    message: "Please enter a valid email address",
  },
  phone: {
    pattern: "^[0-9]{3}-[0-9]{3}-[0-9]{4}$",
    message: "Please enter phone in format: 123-456-7890",
  },
  zipcode: {
    pattern: "^[0-9]{5}(-[0-9]{4})?$",
    message: "Please enter a valid ZIP code",
  },
  url: {
    pattern: "^https?://.*$",
    message: "Please enter a valid URL starting with http:// or https://",
  },
};

export function ValidationRulesEditor({ rules, onUpdate }: ValidationRulesEditorProps) {
  const addRule = () => {
    onUpdate([
      ...rules,
      {
        type: "minLength",
        value: "",
        message: "",
      },
    ]);
  };

  const updateRule = (index: number, updates: Partial<ValidationRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    onUpdate(newRules);
  };

  const removeRule = (index: number) => {
    onUpdate(rules.filter((_, i) => i !== index));
  };

  const applyPreset = (index: number, preset: string) => {
    const presetConfig = VALIDATION_PRESETS[preset];
    if (presetConfig) {
      updateRule(index, {
        type: "pattern",
        value: presetConfig.pattern,
        message: presetConfig.message,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Validation Rules</CardTitle>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="w-3 h-3 mr-1" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No validation rules yet. Click "Add Rule" to get started.
          </p>
        ) : (
          rules.map((rule, index) => (
            <div key={index} className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Rule {index + 1}</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Rule Type */}
              <div className="space-y-2">
                <Label className="text-xs">Type</Label>
                <Select
                  value={rule.type}
                  onValueChange={(value: any) => updateRule(index, { type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minLength">Min Length</SelectItem>
                    <SelectItem value="maxLength">Max Length</SelectItem>
                    <SelectItem value="pattern">Pattern (Regex)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Presets for Pattern type */}
              {rule.type === "pattern" && (
                <div className="space-y-2">
                  <Label className="text-xs">Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(VALIDATION_PRESETS).map((preset) => (
                      <Button
                        key={preset}
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset(index, preset)}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Value */}
              <div className="space-y-2">
                <Label className="text-xs">
                  {rule.type === "pattern" ? "Pattern (regex)" : "Value"}
                </Label>
                <Input
                  value={rule.value}
                  onChange={(e) => updateRule(index, { value: e.target.value })}
                  placeholder={
                    rule.type === "minLength"
                      ? "e.g., 3"
                      : rule.type === "maxLength"
                      ? "e.g., 100"
                      : "Enter pattern or value"
                  }
                />
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <Label className="text-xs">Error Message</Label>
                <Input
                  value={rule.message}
                  onChange={(e) => updateRule(index, { message: e.target.value })}
                  placeholder="This field is invalid"
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
