import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAceForm } from '@/features/ace-forms/hooks';
import { FormAnalytics } from "@/features/ace-forms/components";

export default function AceFormAnalytics() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { data: form, isLoading } = useAceForm(formId || "");

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
          <p className="text-muted-foreground mb-4">This form does not exist.</p>
          <Button onClick={() => navigate("/ace-forms")}>
            Back to Forms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ace-forms")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forms
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{form.name}</h1>
          <p className="text-muted-foreground">Form Analytics & Insights</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <FormAnalytics formId={formId!} />
    </div>
  );
}
