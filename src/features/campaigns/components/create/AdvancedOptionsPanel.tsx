import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { ChevronDown, ChevronRight } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CampaignFormData, LandingPageMode, PostageClass } from "@/types/campaigns";
import { useState } from "react";

interface AdvancedOptionsPanelProps {
  form: UseFormReturn<Partial<CampaignFormData>>;
  clientId: string;
}

export function AdvancedOptionsPanel({ form, clientId }: AdvancedOptionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const enableCallTracking = form.watch("enableCallTracking");
  const postage = form.watch("postage") || "standard";
  const lpMode = form.watch("lp_mode") || "bridge";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Advanced Options</span>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 border-t pt-6">
            {/* Call Tracking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="call-tracking" className="text-base">
                  Enable Call Tracking
                </Label>
                <Switch
                  id="call-tracking"
                  checked={enableCallTracking}
                  onCheckedChange={(checked) => form.setValue("enableCallTracking", checked)}
                />
              </div>
              {enableCallTracking && (
                <p className="text-sm text-muted-foreground">
                  Tracked phone numbers will be assigned automatically when the campaign is activated.
                </p>
              )}
            </div>

            {/* PURL Mode */}
            <div className="space-y-3">
              <Label className="text-base">Landing Page Mode</Label>
              <RadioGroup
                value={lpMode}
                onValueChange={(value) => form.setValue("lp_mode", value as LandingPageMode)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bridge" id="lp-bridge" />
                  <Label htmlFor="lp-bridge" className="cursor-pointer font-normal">
                    Bridge Page (recommended)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="redirect" id="lp-redirect" />
                  <Label htmlFor="lp-redirect" className="cursor-pointer font-normal">
                    Direct Redirect
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* UTM Parameters */}
            <div className="space-y-3">
              <Label className="text-base">UTM Tracking</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="utm-source" className="text-xs text-muted-foreground">
                    Source
                  </Label>
                  <Input
                    id="utm-source"
                    placeholder="directmail"
                    {...form.register("utm_source")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-medium" className="text-xs text-muted-foreground">
                    Medium
                  </Label>
                  <Input
                    id="utm-medium"
                    placeholder="postcard"
                    {...form.register("utm_medium")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="utm-campaign" className="text-xs text-muted-foreground">
                    Campaign
                  </Label>
                  <Input
                    id="utm-campaign"
                    placeholder="spring-2025"
                    {...form.register("utm_campaign")}
                  />
                </div>
              </div>
            </div>

            {/* Delivery Settings */}
            <div className="space-y-3">
              <Label className="text-base">Postage Class</Label>
              <RadioGroup
                value={postage}
                onValueChange={(value) => form.setValue("postage", value as PostageClass)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="standard" id="postage-standard" />
                  <Label htmlFor="postage-standard" className="cursor-pointer font-normal">
                    Standard ($0.48 per piece)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="first_class" id="postage-first" />
                  <Label htmlFor="postage-first" className="cursor-pointer font-normal">
                    First Class ($0.73 per piece)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Mail Date */}
            <div className="space-y-2">
              <Label htmlFor="mail-date">Mail Date (optional)</Label>
              <Input
                id="mail-date"
                type="date"
                {...form.register("mail_date")}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to send as soon as possible
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
