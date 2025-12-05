import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DispositionSelectProps {
  disposition: string;
  notes: string;
  onDispositionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function DispositionSelect({
  disposition,
  notes,
  onDispositionChange,
  onNotesChange,
}: DispositionSelectProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Call Outcome</Label>
        <Select value={disposition} onValueChange={onDispositionChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select outcome..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completed">✓ Completed Successfully</SelectItem>
            <SelectItem value="callback_requested">📞 Callback Requested</SelectItem>
            <SelectItem value="wrong_number">❌ Wrong Number / Not Interested</SelectItem>
            <SelectItem value="questions_resolved">❓ Had Questions (Resolved)</SelectItem>
            <SelectItem value="escalated">⬆️ Escalated to Supervisor</SelectItem>
            <SelectItem value="voicemail">📧 Left Voicemail</SelectItem>
            <SelectItem value="no_answer">🔇 No Answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Call Notes (Optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any notes about this call..."
          className="mt-1 min-h-[80px]"
        />
      </div>
    </div>
  );
}
