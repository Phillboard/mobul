import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Download, Zap } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

export default function GenerateFavicon() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  const generateFavicon = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-favicon");

      if (error) {
        console.error("Function error:", error);
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please try again in a few moments.");
        } else if (error.message?.includes("402")) {
          toast.error("AI credits needed. Please add credits to your workspace.");
        } else {
          toast.error("Failed to generate favicon. Please try again.");
        }
        return;
      }

      if (data?.imageUrl) {
        setFaviconUrl(data.imageUrl);
        toast.success("Favicon generated successfully!");
      } else {
        toast.error("No image was generated. Please try again.");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadFavicon = () => {
    if (!faviconUrl) return;

    const link = document.createElement("a");
    link.href = faviconUrl;
    link.download = "ace-favicon.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Favicon downloaded!");
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Generate ACE Favicon
            </CardTitle>
            <CardDescription>
              Generate a modern, professional favicon for ACE Engage using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={generateFavicon}
              disabled={isGenerating}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Generate Favicon
                </>
              )}
            </Button>

            {faviconUrl && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-sm font-medium mb-3">Preview:</p>
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src={faviconUrl}
                      alt="Generated favicon"
                      className="w-32 h-32 border-2 border-border rounded-lg shadow-lg"
                    />
                    <img
                      src={faviconUrl}
                      alt="Generated favicon small"
                      className="w-16 h-16 border border-border rounded"
                    />
                  </div>
                </div>

                <Button
                  onClick={downloadFavicon}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Favicon
                </Button>

                <div className="border-l-4 border-primary/50 bg-primary/5 p-4 rounded">
                  <p className="text-sm font-medium mb-2">Next Steps:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Download the favicon using the button above</li>
                    <li>Save it as <code className="text-xs bg-muted px-1 py-0.5 rounded">favicon.ico</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded">favicon.png</code></li>
                    <li>Upload it to your public folder</li>
                    <li>Update your index.html to reference the new favicon</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
