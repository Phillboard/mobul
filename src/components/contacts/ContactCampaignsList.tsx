import { useCampaignsByContact } from "@/hooks/useCampaignParticipation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ContactCampaignsListProps {
  contactId: string;
}

const STATUS_COLORS = {
  sent: "secondary",
  delivered: "default",
  redeemed: "default",
} as const;

export function ContactCampaignsList({ contactId }: ContactCampaignsListProps) {
  const { data: participations, isLoading } = useCampaignsByContact(contactId);
  const navigate = useNavigate();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Redemption code copied");
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading campaigns...</div>;
  }

  if (!participations || participations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Campaigns</CardTitle>
          <CardDescription>This contact hasn't been added to any campaigns yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {participations.map((participation) => (
        <Card key={participation.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{participation.campaign.name}</CardTitle>
                <CardDescription>
                  {participation.campaign.mail_date && (
                    <span>Mail Date: {format(new Date(participation.campaign.mail_date), "MMM d, yyyy")}</span>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/campaigns/${participation.campaign_id}`)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={STATUS_COLORS[participation.participation_status as keyof typeof STATUS_COLORS] || "secondary"} className="ml-2">
                  {participation.participation_status}
                </Badge>
              </div>
              
              {participation.redemption_code && (
                <div>
                  <span className="text-muted-foreground">Redemption Code:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {participation.redemption_code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(participation.redemption_code!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div>
                <span className="text-muted-foreground">Participated:</span>
                <div>{format(new Date(participation.participated_at), "MMM d, yyyy")}</div>
              </div>
              
              {participation.redeemed_at && (
                <div>
                  <span className="text-muted-foreground">Redeemed:</span>
                  <div>{format(new Date(participation.redeemed_at), "MMM d, yyyy")}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
