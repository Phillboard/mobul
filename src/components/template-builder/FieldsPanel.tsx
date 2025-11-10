import { User, MapPin, Phone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FieldsPanelProps {
  onAddField: (field: string) => void;
}

const fieldGroups = [
  {
    id: "personal",
    label: "Personal",
    icon: User,
    fields: [
      { value: "{{first_name}}", label: "First Name" },
      { value: "{{last_name}}", label: "Last Name" },
      { value: "{{full_name}}", label: "Full Name" },
      { value: "{{company}}", label: "Company" },
    ],
  },
  {
    id: "address",
    label: "Address",
    icon: MapPin,
    fields: [
      { value: "{{address1}}", label: "Address Line 1" },
      { value: "{{address2}}", label: "Address Line 2" },
      { value: "{{city}}", label: "City" },
      { value: "{{state}}", label: "State" },
      { value: "{{zip}}", label: "ZIP Code" },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: Phone,
    fields: [
      { value: "{{phone}}", label: "Phone" },
      { value: "{{email}}", label: "Email" },
    ],
  },
  {
    id: "special",
    label: "Special",
    icon: QrCode,
    fields: [
      { value: "{{purl}}", label: "Personalized URL" },
      { value: "{{qr_code}}", label: "QR Code" },
    ],
  },
];

export function FieldsPanel({ onAddField }: FieldsPanelProps) {
  return (
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Merge Fields</h3>
        <p className="text-xs text-muted-foreground">Add personalized data fields</p>
      </div>

      <div className="p-4 space-y-6">
        {fieldGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.id}>
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {group.label}
              </Label>
              <div className="space-y-1">
                {group.fields.map((field) => (
                  <Button
                    key={field.value}
                    variant="outline"
                    className="w-full justify-start text-left hover:bg-accent hover:border-primary"
                    onClick={() => onAddField(field.value)}
                  >
                    {field.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
