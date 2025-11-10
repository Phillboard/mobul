import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface MergeFieldSelectorProps {
  onSelect: (field: string) => void;
}

const MERGE_FIELDS = [
  { value: "{{first_name}}", label: "First Name" },
  { value: "{{last_name}}", label: "Last Name" },
  { value: "{{full_name}}", label: "Full Name" },
  { value: "{{company}}", label: "Company" },
  { value: "{{address1}}", label: "Address Line 1" },
  { value: "{{address2}}", label: "Address Line 2" },
  { value: "{{city}}", label: "City" },
  { value: "{{state}}", label: "State" },
  { value: "{{zip}}", label: "ZIP Code" },
  { value: "{{phone}}", label: "Phone" },
  { value: "{{email}}", label: "Email" },
  { value: "{{purl}}", label: "Personalized URL" },
  { value: "{{qr_code}}", label: "QR Code" },
];

export function MergeFieldSelector({ onSelect }: MergeFieldSelectorProps) {
  const [selectedField, setSelectedField] = useState<string>("");

  const handleInsert = () => {
    if (selectedField) {
      onSelect(selectedField);
      setSelectedField("");
    }
  };

  return (
    <div className="space-y-2">
      <Select value={selectedField} onValueChange={setSelectedField}>
        <SelectTrigger>
          <SelectValue placeholder="Select a field" />
        </SelectTrigger>
        <SelectContent>
          {MERGE_FIELDS.map((field) => (
            <SelectItem key={field.value} value={field.value}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="w-full"
        onClick={handleInsert}
        disabled={!selectedField}
      >
        Insert Field
      </Button>
    </div>
  );
}
