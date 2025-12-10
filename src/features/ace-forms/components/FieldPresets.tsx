import { FormField, FieldType } from "@/types/aceForms";
import { nanoid } from "nanoid";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { User, Mail, Phone, MapPin, MessageSquare, Gift } from "lucide-react";

export interface FieldPreset {
  name: string;
  description: string;
  icon: React.ReactNode;
  fields: Omit<FormField, "id">[];
}

export const FIELD_PRESETS: FieldPreset[] = [
  {
    name: "Contact Information",
    description: "Full name, email, and phone number",
    icon: <User className="w-4 h-4" />,
    fields: [
      {
        type: "text",
        label: "First Name",
        placeholder: "John",
        required: true,
        validation: [
          { type: "minLength", value: 2, message: "First name must be at least 2 characters" },
        ],
      },
      {
        type: "text",
        label: "Last Name",
        placeholder: "Doe",
        required: true,
        validation: [
          { type: "minLength", value: 2, message: "Last name must be at least 2 characters" },
        ],
      },
      {
        type: "email",
        label: "Email Address",
        placeholder: "john@example.com",
        required: true,
        helpText: "We'll never share your email with anyone",
        validation: [],
      },
      {
        type: "phone",
        label: "Phone Number",
        placeholder: "(555) 123-4567",
        required: false,
        validation: [],
      },
    ],
  },
  {
    name: "Mailing Address",
    description: "Complete address with street, city, state, and ZIP",
    icon: <MapPin className="w-4 h-4" />,
    fields: [
      {
        type: "text",
        label: "Street Address",
        placeholder: "123 Main St",
        required: true,
        validation: [],
      },
      {
        type: "text",
        label: "City",
        placeholder: "New York",
        required: true,
        validation: [],
      },
      {
        type: "text",
        label: "State",
        placeholder: "NY",
        required: true,
        validation: [
          { type: "maxLength", value: 2, message: "Please use 2-letter state code" },
        ],
      },
      {
        type: "text",
        label: "ZIP Code",
        placeholder: "10001",
        required: true,
        validation: [
          {
            type: "pattern",
            value: "^[0-9]{5}(-[0-9]{4})?$",
            message: "Please enter a valid ZIP code",
          },
        ],
      },
    ],
  },
  {
    name: "Gift Card Redemption",
    description: "Gift card code and contact info for delivery",
    icon: <Gift className="w-4 h-4" />,
    fields: [
      {
        type: "gift-card-code",
        label: "Gift Card Code",
        placeholder: "ABC-123-XYZ",
        required: true,
        helpText: "Find this code on your gift card",
        validation: [],
      },
      {
        type: "email",
        label: "Email Address",
        placeholder: "john@example.com",
        required: true,
        helpText: "We'll send your digital gift card to this email",
        validation: [],
      },
      {
        type: "phone",
        label: "Phone Number (Optional)",
        placeholder: "(555) 123-4567",
        required: false,
        helpText: "For SMS notifications",
        validation: [],
      },
    ],
  },
  {
    name: "Quick Survey",
    description: "Rating, feedback, and comments",
    icon: <MessageSquare className="w-4 h-4" />,
    fields: [
      {
        type: "radio",
        label: "How satisfied are you?",
        required: true,
        options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
        validation: [],
      },
      {
        type: "select",
        label: "How did you hear about us?",
        required: false,
        options: ["Google Search", "Social Media", "Friend Referral", "Advertisement", "Other"],
        validation: [],
      },
      {
        type: "textarea",
        label: "Additional Comments",
        placeholder: "Tell us more...",
        required: false,
        validation: [],
      },
    ],
  },
];

interface FieldPresetsProps {
  onAddPreset: (preset: FieldPreset) => void;
}

export function FieldPresets({ onAddPreset }: FieldPresetsProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium mb-1">Field Presets</h3>
        <p className="text-xs text-muted-foreground">
          Add multiple related fields at once
        </p>
      </div>

      <div className="space-y-2">
        {FIELD_PRESETS.map((preset, index) => (
          <Card key={index} className="hover:border-primary/50 transition-colors">
            <CardHeader className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary shrink-0">
                    {preset.icon}
                  </div>
                  <div>
                    <CardTitle className="text-sm">{preset.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {preset.description}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddPreset(preset)}
                >
                  Add
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
