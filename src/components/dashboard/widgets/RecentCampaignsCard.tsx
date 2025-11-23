import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentCampaignsCardProps {
  dateRange?: number;
}

export function RecentCampaignsCard({ dateRange = 30 }: RecentCampaignsCardProps) {
  const navigate = useNavigate();
  const { recentCampaigns, isLoading } = useDashboardData(dateRange);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      active: { variant: "default", label: "Active" },
      completed: { variant: "outline", label: "Completed" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading campaigns...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Campaigns</CardTitle>
        <CardDescription>Your latest campaign activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentCampaigns?.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium truncate">{campaign.name}</h4>
                  {getStatusBadge(campaign.status || 'draft')}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{campaign.audience_count} recipients</span>
                  {campaign.mail_date && (
                    <span>Mail: {format(new Date(campaign.mail_date), 'MMM d')}</span>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Delivered: {campaign.delivered_count || 0}</span>
                    <span>Scans: {campaign.qr_scans || 0}</span>
                    <span>Leads: {campaign.leads || 0}</span>
                  </div>
                  <Progress
                    value={campaign.audience_count > 0 ? ((campaign.delivered_count || 0) / campaign.audience_count) * 100 : 0}
                    className="h-1"
                  />
                </div>
              </div>
            </div>
          ))}
          {!recentCampaigns?.length && (
            <p className="text-center text-muted-foreground py-8">No recent campaigns</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
