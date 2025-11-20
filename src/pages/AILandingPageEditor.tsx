import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIDesignEditor } from "@/components/ai-design/AIDesignEditor";

export default function AILandingPageEditor() {
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
            onClick={() => navigate("/landing-pages")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Landing Pages
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
          designType="landing_page"
          designId={id}
          onSwitchToManual={() => navigate(`/landing-pages/${id}/visual-editor`)}
        />
      </div>
    </div>
  );
}
