import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function CampaignPrototype() {
  const { campaignId } = useParams();

  const { data: prototype, isLoading } = useQuery({
    queryKey: ["campaign-prototype", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_prototypes")
        .select("*")
        .eq("campaign_id", campaignId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!prototype) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-muted-foreground">Prototype not found</p>
        </Card>
      </div>
    );
  }

  const config = prototype.prototype_config_json as any;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            Campaign Prototype
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{config.campaignName}</h1>
          <p className="text-muted-foreground">
            Interactive preview of recipient experience
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Mail Piece</h2>
          <div className="aspect-[4/6] bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">
              {config.size} Mail Piece Preview
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recipient Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span>
                {config.sampleRecipient.firstName}{" "}
                {config.sampleRecipient.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company:</span>
              <span>{config.sampleRecipient.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span>{config.sampleRecipient.address}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Personalized URL</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Mode:</p>
              <Badge>{config.lpMode === "bridge" ? "Bridge Page" : "Direct Redirect"}</Badge>
            </div>
            {config.baseLpUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Destination URL:
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {config.baseLpUrl}
                </code>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Tracking Parameters:
              </p>
              <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded">
                <p>utm_source={config.utmParams.source}</p>
                <p>utm_medium={config.utmParams.medium}</p>
                <p>utm_campaign={config.utmParams.campaign}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
