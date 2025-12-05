import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentationFeedbackProps {
  pageId: string;
}

export function DocumentationFeedback({ pageId }: DocumentationFeedbackProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative" | null>(null);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedbackType(type);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("documentation_feedback")
      .insert({
        page_id: pageId,
        user_id: user?.id || "",
        is_helpful: feedbackType === "positive",
        feedback_text: comment || null,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thank you!",
      description: "Your feedback has been submitted",
    });
    setShowDialog(false);
    setComment("");
    setFeedbackType(null);
  };

  return (
    <>
      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground mb-4">Was this page helpful?</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFeedback("positive")}
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Yes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFeedback("negative")}
          >
            <ThumbsDown className="h-4 w-4 mr-2" />
            No
          </Button>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {feedbackType === "positive" ? "Great! " : ""}
              Tell us more (optional)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What did you like or what could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Skip
              </Button>
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
