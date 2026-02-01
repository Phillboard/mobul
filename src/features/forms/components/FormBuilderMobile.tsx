import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { Settings, Plus } from "lucide-react";
import { FieldType } from "@/types/aceForms";

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

interface FormBuilderMobileProps {
  onAddField: (type: FieldType) => void;
}

/**
 * Mobile-friendly field library accessible via Sheet drawer
 */
export function FormBuilderMobile({ onAddField }: FormBuilderMobileProps) {
  const [open, setOpen] = useState(false);

  const handleAddField = (type: FieldType) => {
    onAddField(type);
    setOpen(false); // Close sheet after adding field
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="lg:hidden fixed bottom-20 right-4 z-50 rounded-full w-14 h-14 shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Add Form Field</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(80vh-100px)]">
          {fieldTypes.map((field) => (
            <Button
              key={field.type}
              variant="outline"
              className="w-full justify-start text-left h-auto py-4"
              onClick={() => handleAddField(field.type)}
            >
              <div>
                <div className="font-medium">{field.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {field.type === "gift-card-code" && "Special field for gift card codes"}
                  {field.type === "text" && "Single line text input"}
                  {field.type === "email" && "Email address with validation"}
                  {field.type === "phone" && "Phone number input"}
                  {field.type === "textarea" && "Multi-line text area"}
                  {field.type === "select" && "Dropdown selection"}
                  {field.type === "checkbox" && "Multiple choice checkboxes"}
                  {field.type === "radio" && "Single choice radio buttons"}
                  {field.type === "date" && "Date picker"}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
