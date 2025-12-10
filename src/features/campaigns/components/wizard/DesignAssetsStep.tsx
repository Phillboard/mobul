/**
 * DesignAssetsStep - Modern step for landing pages, forms, and mailer design
 * 
 * Features:
 * - Landing page selection/creation
 * - Form selection with preview
 * - Conditional mailer upload (only for self-mailers)
 * - Mail library integration
 * - Drag-drop file upload
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { 
  Layout, 
  FileText, 
  Mail,
  ArrowRight, 
  Plus,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useToast } from '@shared/hooks';
import type { CampaignFormData } from "@/types/campaigns";
import { cn } from '@shared/utils/cn';

interface DesignAssetsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
  isEditMode?: boolean;
  campaignStatus?: string;
}

export function DesignAssetsStep({
  clientId,
  initialData,
  onNext,
  onBack,
  isEditMode,
  campaignStatus,
}: DesignAssetsStepProps) {
  const { toast } = useToast();
  const isAceFulfillment = initialData.mailing_method === 'ace_fulfillment';
  const [selectedLandingPageId, setSelectedLandingPageId] = useState<string>(
    initialData.landing_page_id || ""
  );
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(
    initialData.selected_form_ids || []
  );
  const [selectedMailTemplate, setSelectedMailTemplate] = useState<string>(
    initialData.template_id || ""
  );

  // Fetch landing pages
  const { data: landingPages } = useQuery({
    queryKey: ["landing-pages", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch ACE forms
  const { data: aceForms } = useQuery({
    queryKey: ["ace-forms", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ace_forms")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch mail templates (for ACE fulfillment only)
  const { data: mailTemplates } = useQuery({
    queryKey: ["templates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAceFulfillment,
  });

  const handleNext = () => {
    // Validation: Must have landing page OR form
    if (!selectedLandingPageId && selectedFormIds.length === 0) {
      toast({
        title: "Landing Page or Form Required",
        description: "Please select at least a landing page or form to continue",
        variant: "destructive",
      });
      return;
    }

    // For ACE fulfillment, require mail design
    if (isAceFulfillment && !selectedMailTemplate) {
      toast({
        title: "Mail Design Required",
        description: "ACE fulfillment requires a mail design. Please select a template or save as draft.",
        variant: "destructive",
      });
      return;
    }

    onNext({
      landing_page_id: selectedLandingPageId || undefined,
      selected_form_ids: selectedFormIds.length > 0 ? selectedFormIds : undefined,
      template_id: selectedMailTemplate || undefined,
    });
  };

  const selectedLandingPage = landingPages?.find(p => p.id === selectedLandingPageId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Design Your Campaign</h2>
        </div>
        <p className="text-muted-foreground text-lg">
          Set up your landing page, forms, and design assets
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Landing Page Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              Landing Page
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Landing Page</h4>
                    <p className="text-sm text-muted-foreground">
                      Your landing page is where customers redeem their codes and claim rewards. 
                      You can use an existing page or create a new one.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
            <CardDescription>
              Where customers will redeem their codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {landingPages && landingPages.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Select Landing Page</Label>
                  <Select value={selectedLandingPageId} onValueChange={setSelectedLandingPageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a landing page..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (skip for now)</SelectItem>
                      {landingPages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLandingPage && (
                  <Alert className="border-primary/50 bg-primary/5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <strong className="text-foreground">{selectedLandingPage.name}</strong>
                          {selectedLandingPage.url && (
                            <a 
                              href={selectedLandingPage.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Preview
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {selectedLandingPage.description && (
                          <div className="text-sm text-muted-foreground">
                            {selectedLandingPage.description}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <Layout className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <p className="text-sm font-medium">No landing pages yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create one to get started
                  </p>
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create New Landing Page
            </Button>
          </CardContent>
        </Card>

        {/* Form Selection */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Forms (Optional)
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">ACE Forms</h4>
                    <p className="text-sm text-muted-foreground">
                      Select forms to collect customer information. Forms can trigger reward conditions when submitted.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
            <CardDescription>
              Collect customer information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aceForms && aceForms.length > 0 ? (
              <>
                <div className="space-y-3">
                  {aceForms.map((form) => (
                    <div
                      key={form.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all",
                        selectedFormIds.includes(form.id)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => {
                        setSelectedFormIds(
                          selectedFormIds.includes(form.id)
                            ? selectedFormIds.filter((id) => id !== form.id)
                            : [...selectedFormIds, form.id]
                        );
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          selectedFormIds.includes(form.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {selectedFormIds.includes(form.id) && (
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{form.name}</div>
                          {form.description && (
                            <div className="text-xs text-muted-foreground">{form.description}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {form.field_count || 0} fields
                      </Badge>
                    </div>
                  ))}
                </div>

                {selectedFormIds.length > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {selectedFormIds.length} form{selectedFormIds.length > 1 ? 's' : ''} selected
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <p className="text-sm font-medium">No forms available</p>
                  <p className="text-sm text-muted-foreground">
                    Forms are optional - you can add them later
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mailer Design (Conditional - Only for ACE Fulfillment) */}
        {isAceFulfillment && (
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Mail Piece Design
                <Badge variant="destructive">Required</Badge>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Mail Design</h4>
                      <p className="text-sm text-muted-foreground">
                        Select a template from your mail library that ACE will print and mail for you. 
                        You can also save as draft and upload a custom design later.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardTitle>
              <CardDescription>
                Select a template for printing and mailing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="library" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="library">From Library</TabsTrigger>
                  <TabsTrigger value="upload">Upload New</TabsTrigger>
                </TabsList>

                <TabsContent value="library" className="space-y-4">
                  {mailTemplates && mailTemplates.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {mailTemplates.slice(0, 4).map((template) => (
                          <Card
                            key={template.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              selectedMailTemplate === template.id
                                ? "border-primary border-2"
                                : "border hover:border-primary/50"
                            )}
                            onClick={() => setSelectedMailTemplate(template.id)}
                          >
                            <CardContent className="p-3">
                              <div className="aspect-video bg-muted rounded flex items-center justify-center mb-2">
                                {template.thumbnail_url ? (
                                  <img 
                                    src={template.thumbnail_url} 
                                    alt={template.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                              <div className="text-xs font-medium truncate">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.size}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {mailTemplates.length > 4 && (
                        <Button variant="outline" className="w-full" size="sm">
                          View All Templates ({mailTemplates.length})
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">No templates in library</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">Drag & drop your design</p>
                    <p className="text-xs text-muted-foreground mb-4">or click to browse</p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Supported: JPG, PNG, PDF (max 10MB)
                  </p>
                </TabsContent>
              </Tabs>

              {selectedMailTemplate && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Mailer design selected from library
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          size="lg"
          disabled={!selectedLandingPageId && selectedFormIds.length === 0}
          className="min-w-[180px]"
        >
          Continue to Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

