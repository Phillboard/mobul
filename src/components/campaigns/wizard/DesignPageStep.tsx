/**
 * DesignPageStep - Combined Design Upload and Page/Form Selection
 * 
 * Combines:
 * - Postcard image upload (for AI landing page generation) - shown for BOTH mailing methods
 * - Landing Page selection OR Form selection (tabs)
 * 
 * The uploaded design image is passed to the AI builder to create a matching landing page.
 */

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Palette, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  Layout,
  FormInput,
  Plus,
  Info,
  Upload,
  Image,
  X,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { CampaignFormData, MailingMethod } from "@/types/campaigns";

interface DesignPageStepProps {
  clientId: string;
  campaignId?: string | null;
  initialData: Partial<CampaignFormData>;
  mailingMethod: MailingMethod;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
  onSaveDraft?: () => void;
}

type SelectionMode = 'landing_page' | 'form' | 'skip';

export function DesignPageStep({ 
  clientId, 
  campaignId,
  initialData,
  mailingMethod, 
  onNext, 
  onBack,
  onSaveDraft,
}: DesignPageStepProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Design upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    (initialData as any).design_image_url || null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    (initialData as any).design_image_url || null
  );
  
  // Page/Form selection state
  const [mode, setMode] = useState<SelectionMode>(() => {
    if (initialData.landing_page_id) return 'landing_page';
    if ((initialData as any).selected_form_ids?.length) return 'form';
    return 'landing_page';
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

  // Design upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}-design.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('campaign-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(fileName);

      setUploadedUrl(publicUrl);
      toast({
        title: "Design uploaded",
        description: "Your mail design has been uploaded. AI will use it to match your landing page.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your design. Please try again.",
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedUrl(null);
    setPreviewUrl(null);
  };

  // Navigation handlers
  const handleCreateLandingPageWithAI = () => {
    navigate("/landing-pages/ai-builder", {
      state: { 
        returnTo: "/campaigns/new", 
        campaignId,
        clientId,
        designImageUrl: uploadedUrl,
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
        design_image_url: uploadedUrl,
      } as any);
      return;
    }

    const data: any = {
      design_image_url: uploadedUrl,
    };

    if (mode === 'landing_page' && selectedLandingPageId) {
      data.landing_page_id = selectedLandingPageId;
      data.selected_form_ids = [];
    } else if (mode === 'form' && selectedFormId) {
      data.landing_page_id = undefined;
      data.selected_form_ids = [selectedFormId];
    }

    onNext(data);
  };

  const canProceed = mode === 'skip' || 
    (mode === 'landing_page' && selectedLandingPageId) || 
    (mode === 'form' && selectedFormId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Design & Redemption Page</h2>
        <p className="text-muted-foreground mt-2">
          Upload your mail piece design and choose where customers will redeem their codes
        </p>
      </div>

      {/* Section 1: Upload Mail Design */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Your Mail Design (Optional)
          </CardTitle>
          <CardDescription>
            Upload an image of your postcard or mail piece. Our AI will use it to create a matching landing page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!previewUrl ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed",
                "cursor-pointer hover:bg-muted/50 transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('design-upload')?.click()}
            >
              <input
                id="design-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              
              <p className="text-sm font-medium">
                {isDragging ? "Drop your image here" : "Upload mail design"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, GIF, or WebP (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Mail design preview"
                  className="w-full max-h-48 object-contain rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Design uploaded - AI will match your landing page to this</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 2: Landing Page or Form Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Customer Redemption Page
          </CardTitle>
          <CardDescription>
            Choose where customers will go to validate their codes and receive their gift cards
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                Skip
              </TabsTrigger>
            </TabsList>

            {/* Landing Page Tab */}
            <TabsContent value="landing_page" className="space-y-4 mt-4">
              {loadingPages ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : landingPages && landingPages.length > 0 ? (
                <div className="space-y-2">
                  <Label>Select Landing Page</Label>
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
                              <Badge variant="secondary">Published</Badge>
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
                    No landing pages found. Create one below.
                  </AlertDescription>
                </Alert>
              )}

              {selectedLandingPage && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Selected: {selectedLandingPage.name}</AlertTitle>
                  <AlertDescription>
                    {selectedLandingPage.public_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(selectedLandingPage.public_url!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Preview
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreateLandingPageWithAI} variant="outline" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create with AI
                </Button>
                <Button onClick={handleCreateLandingPageManual} variant="outline" size="sm">
                  <Palette className="mr-2 h-4 w-4" />
                  Visual Editor
                </Button>
              </div>
            </TabsContent>

            {/* Form Tab */}
            <TabsContent value="form" className="space-y-4 mt-4">
              {loadingForms ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : forms && forms.length > 0 ? (
                <div className="space-y-2">
                  <Label>Select Form</Label>
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
                              <Badge variant="secondary">Active</Badge>
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
                    No forms found. Create one below.
                  </AlertDescription>
                </Alert>
              )}

              {selectedForm && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Selected: {selectedForm.name}</AlertTitle>
                  <AlertDescription>
                    {selectedForm.total_submissions || 0} submissions
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleCreateForm} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create New Form
              </Button>
            </TabsContent>

            {/* Skip Tab */}
            <TabsContent value="skip" className="space-y-4 mt-4">
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Skip Redemption Page</AlertTitle>
                <AlertDescription className="text-amber-600">
                  You can add a landing page or form later. Without one, customers won't have a place to redeem codes online.
                </AlertDescription>
              </Alert>
              {showSkipWarning && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Are you sure?</AlertTitle>
                  <AlertDescription>
                    Click "Next" again to confirm skipping.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          {onSaveDraft && (
            <Button type="button" variant="ghost" onClick={onSaveDraft}>
              Save Draft
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canProceed && mode !== 'skip'}>
            {mode === 'skip' 
              ? (showSkipWarning ? "Confirm Skip" : "Skip for Now")
              : "Next: Review"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

