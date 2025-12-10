import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { CallDispositionSelector } from "./CallDispositionSelector";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';
import { Loader2 } from "lucide-react";

interface CompleteCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callSessionId: string;
  onComplete: () => void;
}

export function CompleteCallDialog({
  open,
  onOpenChange,
  callSessionId,
  onComplete,
}: CompleteCallDialogProps) {
  const [disposition, setDisposition] = useState("interested");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Update call session with disposition
      const { error: updateError } = await supabase
        .from("call_sessions")
        .update({
          call_status: "completed",
          call_ended_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", callSessionId);

      if (updateError) throw updateError;

      // Call the complete-call-disposition edge function to handle disposition logic
      const { error: functionError } = await supabase.functions.invoke("complete-call-disposition", {
        body: {
          callSessionId,
          disposition,
          notes,
        },
      });

      if (functionError) throw functionError;

      toast({
        title: "Call completed",
        description: "Call disposition has been recorded successfully.",
      });

      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error completing call:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete call",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete Call</DialogTitle>
        </DialogHeader>

        <CallDispositionSelector
          value={disposition}
          onChange={setDisposition}
          notes={notes}
          onNotesChange={setNotes}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
