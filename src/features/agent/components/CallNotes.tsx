import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdateCallNotes } from "@/hooks/useCallTracking";
import { useState, useEffect } from "react";
import { FileText, Save } from "lucide-react";

interface CallNotesProps {
  callSession: any;
}

export function CallNotes({ callSession }: CallNotesProps) {
  const updateNotes = useUpdateCallNotes();
  const [notes, setNotes] = useState(callSession.notes || "");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setNotes(callSession.notes || "");
    setHasChanges(false);
  }, [callSession.notes]);

  const handleSave = () => {
    updateNotes.mutate({
      sessionId: callSession.id,
      notes: notes,
    });
    setHasChanges(false);
  };

  const handleChange = (value: string) => {
    setNotes(value);
    setHasChanges(value !== (callSession.notes || ""));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Call Notes
          </span>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateNotes.isPending}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateNotes.isPending ? "Saving..." : "Save"}
          </Button>
        </CardTitle>
        <CardDescription>
          Record important details about this call conversation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add your call notes here..."
          rows={8}
          className="resize-none"
        />
        {hasChanges && (
          <p className="text-sm text-muted-foreground mt-2">
            You have unsaved changes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
