import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Smartphone, ExternalLink } from "lucide-react";
import { MailPreviewRenderer } from "@/components/mail/MailPreviewRenderer";
import { useState, useEffect } from "react";

export default function CampaignPrototype() {
  const { campaignId } = useParams();
  const [view, setView] = useState<"physical" | "digital">("physical");
  const [animationStep, setAnimationStep] = useState(0);

  const { data: prototype, isLoading } = useQuery({
    queryKey: ["campaign-prototype", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_prototypes")
        .select("*, campaign:campaigns(*, template:templates(*))")
        .eq("campaign_id", campaignId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Track view event
  const trackViewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        campaign_id: campaignId,
        recipient_id: "00000000-0000-0000-0000-000000000000", // Sample recipient
        event_type: "prototype_viewed",
        source: "prototype_link",
        event_data_json: { view_type: view },
      });
      if (error) throw error;
    },
  });

  useEffect(() => {
    if (prototype) {
      trackViewMutation.mutate();
    }
  }, [prototype]);

  // Animation sequence
  useEffect(() => {
    if (view === "digital" && animationStep < 3) {
      const timer = setTimeout(() => {
        setAnimationStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [view, animationStep]);

  useEffect(() => {
    if (view === "physical") {
      setAnimationStep(0);
    }
  }, [view]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prototype) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="p-6">
          <p className="text-muted-foreground">Prototype not found</p>
        </Card>
      </div>
    );
  }

  const config = prototype.prototype_config_json as any;
  const campaign = prototype.campaign as any;
  const template = campaign?.template;
  const layers = template?.json_layers?.layers || [];

  // Sample recipient data for merge fields
  const sampleRecipient = {
    first_name: config.sampleRecipient?.firstName || "John",
    last_name: config.sampleRecipient?.lastName || "Doe",
    company: config.sampleRecipient?.company || "Sample Company",
    address: config.sampleRecipient?.address || "123 Main St, Anytown, CA 12345",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <Badge variant="secondary" className="mb-4 text-sm">
            Interactive Campaign Preview
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {config.campaignName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            See how your recipients will experience this campaign
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={view === "physical" ? "default" : "outline"}
            onClick={() => setView("physical")}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Physical Mail
          </Button>
          <Button
            variant={view === "digital" ? "default" : "outline"}
            onClick={() => setView("digital")}
            className="gap-2"
          >
            <Smartphone className="h-4 w-4" />
            Digital Experience
          </Button>
        </div>

        {/* Physical Mail View */}
        {view === "physical" && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Mail Piece Preview</h2>
                <p className="text-sm text-muted-foreground">
                  {config.size || campaign.size} • {campaign.postage?.replace('_', ' ') || 'Standard'} Class Mail
                </p>
              </div>

              {/* Template Preview */}
              <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 mx-auto max-w-2xl">
                {layers.length > 0 ? (
                  <MailPreviewRenderer
                    layers={layers}
                    canvasSize={{ width: 800, height: 1200 }}
                  />
                ) : (
                  <div className="aspect-[4/6] bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                    <div className="text-center p-8">
                      <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">
                        {config.size || campaign.size} Mail Piece
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Template preview will appear here
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Elements Callout */}
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Interactive Elements
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• QR Code → Scan to visit personalized landing page</li>
                  <li>• Personalized URL → Type in your unique link</li>
                  <li>• Phone Number → Call for direct assistance</li>
                </ul>
              </div>
            </Card>

            {/* Recipient Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Personalization Example</h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Recipient Name:</span>
                  <span className="font-medium">
                    {sampleRecipient.first_name} {sampleRecipient.last_name}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{sampleRecipient.company}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium text-right">{sampleRecipient.address}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Digital Experience View */}
        {view === "digital" && (
          <div className="space-y-6">
            {/* Step 1: Mail Arrives */}
            <Card className={`p-6 transition-all duration-700 ${animationStep >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-lg font-semibold">Mail Arrives in Mailbox</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Recipient receives personalized {config.size || campaign.size} postcard
              </p>
            </Card>

            {/* Step 2: QR Scan */}
            <Card className={`p-6 transition-all duration-700 delay-300 ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-lg font-semibold">Scan QR Code</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-32 w-32 bg-white border-4 border-primary rounded-lg flex items-center justify-center">
                  <div className="text-xs text-center text-muted-foreground">QR Code</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Recipient uses smartphone camera to scan
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Tracked: Device, Time, Location
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Step 3: PURL Landing Page */}
            <Card className={`p-6 transition-all duration-700 delay-500 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-lg font-semibold">Personalized Landing Page</h3>
              </div>
              <div className="bg-gradient-to-br from-muted to-muted/50 rounded-lg p-6 border">
                <div className="mb-4">
                  <h4 className="text-xl font-bold mb-2">
                    Welcome, {sampleRecipient.first_name}!
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This page is personalized just for you
                  </p>
                </div>
                <div className="space-y-2 text-xs font-mono bg-background/50 p-3 rounded">
                  <p>URL: {config.baseLpUrl || campaign.base_lp_url}?token=ABC123</p>
                  <p>utm_source={config.utmParams?.source || campaign.utm_source}</p>
                  <p>utm_medium={config.utmParams?.medium || campaign.utm_medium}</p>
                  <p>utm_campaign={config.utmParams?.campaign || campaign.utm_campaign}</p>
                </div>
              </div>
            </Card>

            {/* Step 4: Action Module */}
            <Card className={`p-6 transition-all duration-700 delay-700 ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h3 className="text-lg font-semibold">Take Action</h3>
              </div>
              <div className="bg-white rounded-lg p-6 border shadow-sm">
                <h4 className="font-semibold mb-4">Contact Form</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Full Name</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      {sampleRecipient.first_name} {sampleRecipient.last_name}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm">
                      john.doe@example.com
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Message</label>
                    <div className="mt-1 p-2 bg-muted rounded text-sm h-20">
                      I'm interested in learning more...
                    </div>
                  </div>
                  <Button className="w-full" size="sm">
                    Submit Interest
                  </Button>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                  ✓ Lead captured and added to your CRM automatically
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Campaign Settings */}
        <Card className="p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Campaign Settings</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Landing Page Mode:</p>
              <Badge variant="outline">
                {config.lpMode === "bridge" ? "Bridge Page (Hosted)" : "Direct Redirect"}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Mail Date:</p>
              <p className="font-medium">
                {campaign.mail_date ? new Date(campaign.mail_date).toLocaleDateString() : "Not scheduled"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
