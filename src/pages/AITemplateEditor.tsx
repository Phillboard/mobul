import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIDesignEditor } from "@/components/ai-design/AIDesignEditor";

export default function AITemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card p-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/templates")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wand2 className="h-4 w-4" />
            AI Design Editor
          </div>
        </div>
      </div>

      {/* AI Editor */}
      <div className="flex-1 overflow-hidden">
        <AIDesignEditor
          designType="template"
          designId={id === "new" ? undefined : id}
          onSwitchToManual={() => navigate(`/templates/${id}/builder-v2`)}
        />
      </div>
    </div>
  );
}
