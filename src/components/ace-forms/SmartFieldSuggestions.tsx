import { useEffect, useState } from "react";
import { FormField, FieldType } from "@/types/aceForms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SmartFieldSuggestionsProps {
  field: FormField;
  onApplySuggestion: (updates: Partial<FormField>) => void;
}

interface Suggestion {
  label: string;
  updates: Partial<FormField>;
  reason: string;
}

export function SmartFieldSuggestions({ field, onApplySuggestion }: SmartFieldSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    // Generate smart suggestions based on field type and label
    const newSuggestions: Suggestion[] = [];

    const labelLower = field.label.toLowerCase();

    // Email field suggestions
    if (field.type === "email" || labelLower.includes("email")) {
      if (!field.placeholder) {
        newSuggestions.push({
          label: "Add email placeholder",
          updates: { placeholder: "name@example.com" },
          reason: "Helps users understand the expected format",
        });
      }
      if (!field.helpText) {
        newSuggestions.push({
          label: "Add help text",
          updates: { helpText: "We'll never share your email with anyone" },
          reason: "Builds trust with users",
        });
      }
    }

    // Phone field suggestions
    if (field.type === "phone" || labelLower.includes("phone")) {
      if (!field.placeholder) {
        newSuggestions.push({
          label: "Add phone format",
          updates: { placeholder: "(555) 123-4567" },
          reason: "Shows the expected phone number format",
        });
      }
      if (!field.helpText) {
        newSuggestions.push({
          label: "Add SMS opt-in notice",
          updates: { helpText: "We may send you SMS updates about your gift card" },
          reason: "Complies with SMS regulations",
        });
      }
    }

    // Name field suggestions
    if (labelLower.includes("name") && field.type === "text") {
      if (!field.placeholder) {
        newSuggestions.push({
          label: "Add name placeholder",
          updates: { placeholder: labelLower.includes("first") ? "John" : "John Doe" },
          reason: "Provides a clear example",
        });
      }
    }

    // Gift card code suggestions
    if (field.type === "gift-card-code") {
      if (!field.placeholder) {
        newSuggestions.push({
          label: "Add code format hint",
          updates: { placeholder: "ABC-123-XYZ" },
          reason: "Shows expected code format",
        });
      }
      if (!field.helpText) {
        newSuggestions.push({
          label: "Add location help",
          updates: { helpText: "Find this code on the back of your gift card" },
          reason: "Helps users locate their code",
        });
      }
      if (!field.required) {
        newSuggestions.push({
          label: "Make required",
          updates: { required: true },
          reason: "Gift card code is essential for redemption",
        });
      }
    }

    // General suggestions
    if (field.type === "textarea" && !field.placeholder) {
      newSuggestions.push({
        label: "Add placeholder",
        updates: { placeholder: "Enter your response here..." },
        reason: "Guides user input",
      });
    }

    setSuggestions(newSuggestions);
  }, [field]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Smart Suggestions
        </CardTitle>
        <CardDescription className="text-xs">
          AI-powered improvements for this field
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-background/50 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{suggestion.label}</p>
              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onApplySuggestion(suggestion.updates)}
              className="shrink-0"
            >
              Apply
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
