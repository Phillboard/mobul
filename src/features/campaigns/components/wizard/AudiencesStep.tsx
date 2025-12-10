/**
 * AudiencesStep - Select contact list or audience for campaign
 * 
 * This step allows selecting from existing contact lists.
 * Codes will be auto-generated for selected contacts.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight,
  Calendar,
  List
} from "lucide-react";
import { useToast } from '@shared/hooks';
import type { CampaignFormData } from "@/types/campaigns";
import { format } from "date-fns";

interface AudiencesStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function AudiencesStep({ 
  clientId, 
  initialData, 
  onNext, 
  onBack 
}: AudiencesStepProps) {
  const { toast } = useToast();
  const [selectedListId, setSelectedListId] = useState<string>(initialData.contact_list_id || "");
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Fetch contact lists
  const { data: contactLists, isLoading: loadingLists } = useQuery({
    queryKey: ["contact-lists", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_lists")
        .select("id, name, contact_count, list_type, created_at, description")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const selectedList = contactLists?.find(l => l.id === selectedListId);

  const handleNext = () => {
    if (!selectedListId) {
      toast({
        title: "List Required",
        description: "Please select a contact list to continue",
        variant: "destructive",
      });
      return;
    }

    onNext({
      contact_list_id: selectedListId,
      audience_selection_complete: true,
      selected_audience_type: 'list',
      recipient_count: selectedList?.contact_count || 0,
    });
  };

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }

    // User confirmed skip
    toast({
      title: "Skipped Audience Selection",
      description: "You can upload codes manually in the next step.",
      variant: "default",
    });

    onNext({
      audience_selection_complete: false,
      selected_audience_type: 'csv',
      recipient_count: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Select Your Audience</h2>
        <p className="text-muted-foreground mt-2">
          Choose a contact list for this campaign. Unique redemption codes will be auto-generated for each contact.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-5 w-5" />
            Contact Lists
          </CardTitle>
          <CardDescription>
            Select an existing contact list. Each contact will become a campaign recipient with a unique code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingLists ? (
            <p className="text-sm text-muted-foreground">Loading contact lists...</p>
          ) : contactLists && contactLists.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Contact List</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contact list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{list.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {list.contact_count || 0} contacts
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedList && (
                <Alert className="border-primary/50 bg-primary/5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertTitle>List Selected</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{selectedList.name}</span>
                        <Badge variant="default">
                          <Users className="h-3 w-3 mr-1" />
                          {selectedList.contact_count || 0} contacts
                        </Badge>
                      </div>
                      {selectedList.description && (
                        <p className="text-sm text-muted-foreground">{selectedList.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <List className="h-3 w-3" />
                          <span>Type: {selectedList.list_type || 'Standard'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {format(new Date(selectedList.created_at), 'PP')}</span>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-background rounded-md border">
                        <p className="text-sm font-medium mb-1">What happens next:</p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                          <li>All {selectedList.contact_count || 0} contacts will become campaign recipients</li>
                          <li>Unique redemption codes will be automatically generated</li>
                          <li>QR codes and PURLs will be created for tracking</li>
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Contact Lists Found</AlertTitle>
              <AlertDescription>
                You need to create a contact list first, or you can skip this step and upload codes manually via CSV in the next step.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Skip Warning */}
      {showSkipWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Skip Audience Selection?</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              If you skip, you'll need to upload a CSV file with codes and contact information in the next step.
            </p>
            <p className="font-semibold">
              Click "Skip Audience Selection" again to confirm.
            </p>
          </AlertDescription>
        </Alert>
      )}

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
            {showSkipWarning ? "Skip Audience Selection (Confirm)" : "Skip for Now"}
          </Button>

          {selectedListId && (
            <Button onClick={handleNext}>
              Continue with {selectedList?.contact_count || 0} Contacts
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

