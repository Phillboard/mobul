import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from '@core/services/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Palette, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  Layout
} from "lucide-react";
import type { CampaignFormData } from "@/types/campaigns";

interface LandingPageSelectionStepProps {
  clientId: string;
  campaignId?: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function LandingPageSelectionStep({ 
  clientId, 
  campaignId,
  initialData, 
  onNext, 
  onBack 
}: LandingPageSelectionStepProps) {
  const navigate = useNavigate();
  const [selectedLandingPageId, setSelectedLandingPageId] = useState<string>(
    initialData.landing_page_id || ""
  );
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const { data: landingPages, isLoading } = useQuery({
    queryKey: ["landing-pages", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("id, name, public_url, template, created_at, is_published")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const selectedLandingPage = landingPages?.find(
    (page) => page.id === selectedLandingPageId
  );

  const handleCreateWithAI = () => {
    // Navigate to AI builder with return state
    navigate("/landing-pages/ai-builder", {
      state: { 
        returnTo: "/campaigns/new", 
        campaignId,
        clientId
      }
    });
  };

  const handleCreateWithEditor = () => {
    // Navigate to visual editor with return state
    navigate("/landing-pages/new", {
      state: { 
        returnTo: "/campaigns/new", 
        campaignId,
        clientId
      }
    });
  };

  const handleNext = () => {
    if (!selectedLandingPageId) {
      return; // Button should be disabled, but extra safety
    }

    onNext({
      landing_page_id: selectedLandingPageId
    });
  };

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }

    // User confirmed skip
    onNext({
      landing_page_id: undefined
    });
  };

  const canProceed = !!selectedLandingPageId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campaign Landing Page</h2>
        <p className="text-muted-foreground mt-2">
          Customers will visit this page to redeem their codes and engage with your campaign
        </p>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Select Landing Page
          </CardTitle>
          <CardDescription>
            Choose an existing landing page or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading landing pages...</p>
          ) : landingPages && landingPages.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Existing Landing Pages</Label>
                <Select
                  value={selectedLandingPageId}
                  onValueChange={setSelectedLandingPageId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a landing page..." />
                  </SelectTrigger>
                  <SelectContent>
                    {landingPages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        <div className="flex items-center gap-2">
                          <span>{page.name}</span>
                          {page.is_published && (
                            <Badge variant="secondary" className="ml-2">Published</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLandingPage && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Selected: {selectedLandingPage.name}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="text-sm">
                      Public URL: <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {selectedLandingPage.public_url || "Not published yet"}
                      </code>
                    </p>
                    {selectedLandingPage.public_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(selectedLandingPage.public_url!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Preview Page
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No landing pages found. Create one using the options below.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Create New Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Landing Page</CardTitle>
          <CardDescription>
            Build a landing page using AI or our visual editor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleCreateWithAI}
            variant="outline"
            className="w-full justify-start"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Create with AI
            <span className="ml-auto text-xs text-muted-foreground">Recommended</span>
          </Button>
          
          <Button
            onClick={handleCreateWithEditor}
            variant="outline"
            className="w-full justify-start"
          >
            <Palette className="mr-2 h-4 w-4" />
            Create with Visual Editor
            <span className="ml-auto text-xs text-muted-foreground">Full control</span>
          </Button>

          <p className="text-xs text-muted-foreground">
            You'll be returned to this wizard after creating your landing page
          </p>
        </CardContent>
      </Card>

      {/* Validation Error */}
      {!canProceed && !showSkipWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Landing Page Optional</AlertTitle>
          <AlertDescription>
            You can select a landing page now or skip this step and configure it later.
          </AlertDescription>
        </Alert>
      )}

      {/* Skip Warning */}
      {showSkipWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Skip Landing Page?</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Skipping the landing page means customers won't have a web page to redeem their codes or engage with your campaign.
            </p>
            <p className="font-semibold">
              You can add a landing page later. Click "Skip for Now" again to confirm.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Integration Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">Why Landing Pages Matter</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Your landing page will:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Validate customer redemption codes</li>
            <li>Collect additional customer information</li>
            <li>Trigger gift card provisioning (if rewards enabled)</li>
            <li>Track engagement and conversions</li>
            <li>Provide personalized experiences with PURLs</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>

        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={handleSkip}
            className={showSkipWarning ? "border-2 border-destructive" : ""}
          >
            {showSkipWarning ? "Skip for Now (Confirm)" : "Skip for Now"}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed}
          >
            Next: Link Forms
          </Button>
        </div>
      </div>
    </div>
  );
}

