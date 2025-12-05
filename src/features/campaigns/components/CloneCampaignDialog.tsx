/**
 * CloneCampaignDialog
 * 
 * Dialog for cloning campaigns with options to modify settings.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@shared/hooks';
import { Copy, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Campaign {
  id: string;
  name: string;
  client_id: string;
  audience_id?: string;
  status: string;
  mailing_method?: string;
  mail_date?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface CloneCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloneCampaignDialog({
  campaign,
  open,
  onOpenChange,
}: CloneCampaignDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [newName, setNewName] = useState(`${campaign.name} (Copy)`);
  const [options, setOptions] = useState({
    includeAudience: true,
    includeConditions: true,
    includeLandingPage: false,
    includeUtmSettings: true,
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the new campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: newName,
          client_id: campaign.client_id,
          status: 'draft',
          mailing_method: campaign.mailing_method,
          audience_id: options.includeAudience ? campaign.audience_id : null,
          utm_source: options.includeUtmSettings ? campaign.utm_source : null,
          utm_medium: options.includeUtmSettings ? campaign.utm_medium : null,
          utm_campaign: options.includeUtmSettings ? newName.toLowerCase().replace(/\s+/g, '-') : null,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Clone conditions if requested
      if (options.includeConditions) {
        const { data: conditions } = await supabase
          .from('campaign_conditions')
          .select('*')
          .eq('campaign_id', campaign.id);

        if (conditions && conditions.length > 0) {
          const newConditions = conditions.map(cond => ({
            campaign_id: newCampaign.id,
            condition_number: cond.condition_number,
            condition_name: cond.condition_name,
            condition_type: cond.condition_type,
            brand_id: cond.brand_id,
            card_value: cond.card_value,
            is_active: cond.is_active,
          }));

          await supabase.from('campaign_conditions').insert(newConditions);
        }
      }

      // 3. Clone landing page if requested
      if (options.includeLandingPage) {
        const { data: landingPages } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('campaign_id', campaign.id);

        if (landingPages && landingPages.length > 0) {
          const newLandingPages = landingPages.map(lp => ({
            campaign_id: newCampaign.id,
            client_id: lp.client_id,
            template_name: `${lp.template_name} (Copy)`,
            page_type: lp.page_type,
            html_content: lp.html_content,
            css_content: lp.css_content,
            is_published: false, // Don't auto-publish
          }));

          await supabase.from('landing_pages').insert(newLandingPages);
        }
      }

      return newCampaign;
    },
    onSuccess: (newCampaign) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign Cloned',
        description: `"${newName}" has been created as a draft`,
      });
      onOpenChange(false);
      navigate(`/campaigns/${newCampaign.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Clone Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClone = () => {
    if (!newName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the cloned campaign',
        variant: 'destructive',
      });
      return;
    }
    cloneMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Campaign
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{campaign.name}" with your choice of settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* New Name */}
          <div className="space-y-2">
            <Label htmlFor="name">New Campaign Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter campaign name"
            />
          </div>

          {/* Clone Options */}
          <div className="space-y-3">
            <Label>Include in Clone</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAudience"
                checked={options.includeAudience}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeAudience: !!checked }))
                }
              />
              <label
                htmlFor="includeAudience"
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Audience/Recipients
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeConditions"
                checked={options.includeConditions}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeConditions: !!checked }))
                }
              />
              <label
                htmlFor="includeConditions"
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Reward Conditions & Gift Cards
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLandingPage"
                checked={options.includeLandingPage}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeLandingPage: !!checked }))
                }
              />
              <label
                htmlFor="includeLandingPage"
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Landing Page Design
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeUtmSettings"
                checked={options.includeUtmSettings}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeUtmSettings: !!checked }))
                }
              />
              <label
                htmlFor="includeUtmSettings"
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                UTM Tracking Settings
              </label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The cloned campaign will be created as a draft. Mail date and other 
            time-sensitive settings will need to be reconfigured.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={cloneMutation.isPending}>
            {cloneMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cloning...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Clone Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

