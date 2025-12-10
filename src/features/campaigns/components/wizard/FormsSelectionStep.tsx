import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { Plus, Sparkles, FormInput, AlertCircle, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from '@shared/hooks';
import type { CampaignFormData } from "@/types/campaigns";

interface FormsSelectionStepProps {
  clientId: string;
  campaignId?: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function FormsSelectionStep({
  clientId,
  campaignId,
  initialData,
  onNext,
  onBack,
}: FormsSelectionStepProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(
    (initialData as any).selected_form_ids || []
  );

  // Fetch existing ACE forms
  const { data: forms, isLoading } = useQuery({
    queryKey: ["ace-forms-for-campaign", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ace_forms")
        .select(`
          id,
          name,
          description,
          total_submissions,
          total_views,
          is_active,
          campaign_id,
          campaigns (
            id,
            name
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleToggleForm = (formId: string) => {
    setSelectedFormIds((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
    );
  };

  const handleCreateForm = () => {
    // Navigate to form builder with return state
    navigate("/ace-forms/new", {
      state: {
        returnTo: "/campaigns/new",
        campaignId,
        clientId,
      },
    });
  };

  const handleNext = () => {
    // Validation - at least one form recommended but not required
    if (selectedFormIds.length === 0) {
      toast({
        title: "No Forms Selected",
        description: "You can still proceed, but linking forms is recommended for code validation.",
      });
    }

    onNext({
      selected_form_ids: selectedFormIds,
    } as any);
  };

  const availableForms = forms?.filter((f) => !f.campaign_id || f.campaign_id === campaignId) || [];
  const linkedToOtherForms = forms?.filter((f) => f.campaign_id && f.campaign_id !== campaignId) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Link Forms to Campaign</h2>
        <p className="text-muted-foreground mt-2">
          Select forms that will be linked to this campaign for code validation and rewards
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Linking forms to campaigns enables automatic code validation and gift card provisioning when
          customers submit forms.
        </AlertDescription>
      </Alert>

      {/* Create New Form Options */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Create New Form</CardTitle>
          <CardDescription>Build a form linked to this campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleCreateForm} variant="outline" className="w-full justify-start">
            <Sparkles className="mr-2 h-4 w-4" />
            Create with AI Form Builder
            <span className="ml-auto text-xs text-muted-foreground">Recommended</span>
          </Button>

          <p className="text-xs text-muted-foreground">
            You'll be returned to this wizard after creating your form
          </p>
        </CardContent>
      </Card>

      {/* Available Forms */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading forms...</p>
          </CardContent>
        </Card>
      ) : availableForms.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FormInput className="h-5 w-5" />
              Available Forms ({availableForms.length})
            </CardTitle>
            <CardDescription>Select forms to link to this campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableForms.map((form) => (
              <div
                key={form.id}
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedFormIds.includes(form.id)
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleToggleForm(form.id)}
              >
                <Checkbox
                  checked={selectedFormIds.includes(form.id)}
                  onCheckedChange={() => handleToggleForm(form.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{form.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={form.is_active ? "default" : "secondary"}>
                        {form.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {form.campaign_id === campaignId && (
                        <Badge variant="outline">Already Linked</Badge>
                      )}
                    </div>
                  </div>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{form.total_submissions || 0} submissions</span>
                    <span>{form.total_views || 0} views</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <FormInput className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No forms available</p>
              <Button onClick={handleCreateForm} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Form
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forms Linked to Other Campaigns */}
      {linkedToOtherForms.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Forms Linked to Other Campaigns
            </CardTitle>
            <CardDescription>
              These forms are already linked and cannot be selected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedToOtherForms.map((form) => (
              <div key={form.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <div className="font-medium">{form.name}</div>
                  {form.campaigns && (
                    <p className="text-sm text-muted-foreground">
                      Linked to: {(form.campaigns as any).name}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">Unavailable</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedFormIds.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Forms Selected</AlertTitle>
          <AlertDescription>
            {selectedFormIds.length} form{selectedFormIds.length > 1 ? "s" : ""} will be linked to this
            campaign. Forms will validate redemption codes and can trigger automatic gift card
            provisioning.
          </AlertDescription>
        </Alert>
      )}

      {/* Skip Option */}
      {selectedFormIds.length === 0 && availableForms.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Optional Step</AlertTitle>
          <AlertDescription>
            You can skip this step if you don't need forms for this campaign. You can always link forms
            later from the campaign details page.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          {selectedFormIds.length > 0 ? "Next: Delivery Settings" : "Skip Forms"}
        </Button>
      </div>
    </div>
  );
}

