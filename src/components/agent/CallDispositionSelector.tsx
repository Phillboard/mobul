import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Phone, Clock, AlertCircle } from "lucide-react";

interface CallDispositionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

const dispositions = [
  { value: "interested", label: "Interested", icon: CheckCircle, color: "text-green-600" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-600" },
  { value: "callback", label: "Call Back Later", icon: Clock, color: "text-yellow-600" },
  { value: "invalid_number", label: "Invalid Number", icon: AlertCircle, color: "text-gray-600" },
  { value: "voicemail", label: "Voicemail", icon: Phone, color: "text-blue-600" },
];

export function CallDispositionSelector({
  value,
  onChange,
  notes,
  onNotesChange,
}: CallDispositionSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Call Disposition</Label>
        <RadioGroup value={value} onValueChange={onChange} className="mt-2 space-y-2">
          {dispositions.map((disposition) => {
            const Icon = disposition.icon;
            return (
              <div key={disposition.value} className="flex items-center space-x-2">
                <RadioGroupItem value={disposition.value} id={disposition.value} />
                <Label
                  htmlFor={disposition.value}
                  className="flex items-center gap-2 cursor-pointer font-normal"
                >
                  <Icon className={`h-4 w-4 ${disposition.color}`} />
                  {disposition.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="call-notes">Call Notes</Label>
        <Textarea
          id="call-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Enter any relevant notes about this call..."
          rows={4}
          className="mt-2"
        />
      </div>
    </div>
  );
}
