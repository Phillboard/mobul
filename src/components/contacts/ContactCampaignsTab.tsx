import { useCampaignParticipationStats } from "@/hooks/useCampaignParticipation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactCampaignsList } from "./ContactCampaignsList";
import { Mail, CheckCircle, Send, Package } from "lucide-react";

interface ContactCampaignsTabProps {
  contactId: string;
}

export function ContactCampaignsTab({ contactId }: ContactCampaignsTabProps) {
  const { data: stats } = useCampaignParticipationStats(contactId);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Total Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delivered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Redeemed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.redeemed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Campaign History</h3>
        <ContactCampaignsList contactId={contactId} />
      </div>
    </div>
  );
}
