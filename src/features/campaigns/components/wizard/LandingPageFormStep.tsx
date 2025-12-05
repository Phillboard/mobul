/**
 * LandingPageFormStep - Combined Landing Page and Form Selection
 * 
 * Per Mike's requirements: Landing pages and forms are either/or.
 * When building a landing page with AI, you're essentially building a form at the same time.
 * The customer gets a link to either a landing page OR a form, not both.
 */

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Palette, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  Layout,
  FormInput,
  Plus,
  Info
} from "lucide-react";
import type { CampaignFormData } from "@/types/campaigns";

interface LandingPageFormStepProps {
  clientId: string;
  campaignId?: string | null;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
  designImageUrl?: string;
}

type SelectionMode = 'landing_page' | 'form' | 'skip';

export function LandingPageFormStep({ 
  clientId, 
  campaignId,
  initialData, 
  onNext, 
  onBack,
  designImageUrl,
}: LandingPageFormStepProps) {
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<SelectionMode>(() => {
    if (initialData.landing_page_id) return 'landing_page';
    if ((initialData as any).selected_form_ids?.length) return 'form';
    return 'landing_page'; // Default to landing page
  });
  
  const [selectedLandingPageId, setSelectedLandingPageId] = useState<string>(
    initialData.landing_page_id || ""
  );
  const [selectedFormId, setSelectedFormId] = useState<string>(
    (initialData as any).selected_form_ids?.[0] || ""
  );
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Fetch landing pages
  const { data: landingPages, isLoading: loadingPages } = useQuery({
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

  // Fetch forms
  const { data: forms, isLoading: loadingForms } = useQuery({
    queryKey: ["ace-forms", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ace_forms")
        .select("id, name, description, total_submissions, is_active, campaign_id")
        .eq("client_id", clientId)
        .or(`campaign_id.is.null,campaign_id.eq.${campaignId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const selectedLandingPage = landingPages?.find((page) => page.id === selectedLandingPageId);
  const selectedForm = forms?.find((form) => form.id === selectedFormId);

  const handleCreateLandingPageWithAI = () => {
    navigate("/landing-pages/ai-builder", {
      state: { 
        returnTo: "/campaigns/new", 
        campaignId,
        clientId,
        designImageUrl, // Pass the uploaded design for AI to use
      }
    });
  };

  const handleCreateLandingPageManual = () => {
    navigate("/landing-pages/new", {
      state: { 
        returnTo: "/campaigns/new", 
        campaignId,
        clientId
      }
    });
  };

  const handleCreateForm = () => {
    navigate("/ace-forms/new", {
      state: {
        returnTo: "/campaigns/new",
        campaignId,
        clientId,
      },
    });
  };

  const handleNext = () => {
    if (mode === 'skip') {
      if (!showSkipWarning) {
        setShowSkipWarning(true);
        return;
      }
      onNext({
        landing_page_id: undefined,
        selected_form_ids: [],
      } as any);
      return;
    }

    if (mode === 'landing_page' && selectedLandingPageId) {
      onNext({
        landing_page_id: selectedLandingPageId,
        selected_form_ids: [],
      } as any);
    } else if (mode === 'form' && selectedFormId) {
      onNext({
        landing_page_id: undefined,
        selected_form_ids: [selectedFormId],
      } as any);
    }
  };

  const canProceed = mode === 'skip' || 
    (mode === 'landing_page' && selectedLandingPageId) || 
    (mode === 'form' && selectedFormId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customer Redemption Page</h2>
        <p className="text-muted-foreground mt-2">
          Where customers go to redeem their codes and get their gift cards
        </p>
      </div>

      {/* Info about design image for AI */}
      {designImageUrl && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            <strong>Design uploaded!</strong> When you create a landing page with AI, it will 
            automatically match your mail piece design.
          </AlertDescription>
        </Alert>
      )}

      {/* Mode Selection Tabs */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as SelectionMode); setShowSkipWarning(false); }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="landing_page" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Landing Page
          </TabsTrigger>
          <TabsTrigger value="form" className="flex items-center gap-2">
            <FormInput className="h-4 w-4" />
            ACE Form
          </TabsTrigger>
          <TabsTrigger value="skip" className="text-muted-foreground">
            Skip for Now
          </TabsTrigger>
        </TabsList>

        {/* Landing Page Tab */}
        <TabsContent value="landing_page" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select or Create Landing Page</CardTitle>
              <CardDescription>
                A branded page where customers validate codes and engage with your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPages ? (
                <p className="text-sm text-muted-foreground">Loading landing pages...</p>
              ) : landingPages && landingPages.length > 0 ? (
                <div className="space-y-2">
                  <Label>Existing Landing Pages</Label>
                  <Select value={selectedLandingPageId} onValueChange={setSelectedLandingPageId}>
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
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No landing pages found. Create one using the options below.
                  </AlertDescription>
                </Alert>
              )}

              {selectedLandingPage && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Selected: {selectedLandingPage.name}</AlertTitle>
                  <AlertDescription className="space-y-2">
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

              <div className="border-t pt-4 space-y-2">
                <Label className="text-muted-foreground">Or create new:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleCreateLandingPageWithAI} variant="outline" className="justify-start">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create with AI
                  </Button>
                  <Button onClick={handleCreateLandingPageManual} variant="outline" className="justify-start">
                    <Palette className="mr-2 h-4 w-4" />
                    Visual Editor
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Form Tab */}
        <TabsContent value="form" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select or Create ACE Form</CardTitle>
              <CardDescription>
                An embeddable form for code validation and gift card delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingForms ? (
                <p className="text-sm text-muted-foreground">Loading forms...</p>
              ) : forms && forms.length > 0 ? (
                <div className="space-y-2">
                  <Label>Existing Forms</Label>
                  <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a form..." />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          <div className="flex items-center gap-2">
                            <span>{form.name}</span>
                            {form.is_active && (
                              <Badge variant="secondary" className="ml-2">Active</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No forms found. Create one using the button below.
                  </AlertDescription>
                </Alert>
              )}

              {selectedForm && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Selected: {selectedForm.name}</AlertTitle>
                  <AlertDescription>
                    {selectedForm.total_submissions || 0} submissions so far
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-4">
                <Button onClick={handleCreateForm} variant="outline" className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skip Tab */}
        <TabsContent value="skip" className="space-y-4 mt-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-5 w-5 text-yellow-600" />
                Skip This Step
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You can skip this step and add a landing page or form later. However, without 
                a page or form, customers won't have a place to redeem their codes online.
              </p>
              {showSkipWarning && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Are you sure?</AlertTitle>
                  <AlertDescription>
                    Click "Continue" again to confirm skipping. You can add a page later.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* What this does info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 text-sm space-y-2">
          <p className="font-medium">What happens when a customer visits:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>They enter their unique code to validate</li>
            <li>After meeting conditions, they receive their gift card link</li>
            <li>The gift card is delivered via SMS to their phone</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>

        <Button onClick={handleNext} disabled={!canProceed && mode !== 'skip'}>
          {mode === 'skip' 
            ? (showSkipWarning ? "Confirm Skip" : "Skip for Now")
            : "Next: Review"}
        </Button>
      </div>
    </div>
  );
}

