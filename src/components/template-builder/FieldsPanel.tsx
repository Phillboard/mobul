import { User, MapPin, Phone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FieldsPanelProps {
  onAddField: (field: string) => void;
  onDragStart?: (fieldValue: string) => void;
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

export function FieldsPanel({ onAddField, onDragStart }: FieldsPanelProps) {
  const handleDragStart = (e: React.DragEvent, fieldValue: string) => {
    e.dataTransfer.effectAllowed = "copy";
    const fieldData = {
      type: "field",
      value: fieldValue,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(fieldData));
    if (onDragStart) {
      onDragStart(fieldValue);
    }
  };

  return (
    <div className="w-64 border-r border-border bg-background">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <h3 className="font-semibold flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Merge Fields
        </h3>
        <p className="text-xs text-muted-foreground mt-2">
          Drag onto canvas to personalize
        </p>
      </div>

      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {fieldGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.id}>
              <Label className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {group.label}
              </Label>
              <div className="space-y-2">
                {group.fields.map((field) => (
                  <Button
                    key={field.value}
                    variant="outline"
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.value)}
                    className="w-full justify-start text-left hover:bg-builder-tool-active hover:text-white hover:border-builder-tool-active transition-all duration-200 text-sm font-medium cursor-move"
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
