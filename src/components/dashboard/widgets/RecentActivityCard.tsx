import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Mail, QrCode, MousePointer, User, Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityCardProps {
  dateRange?: number;
}

export function RecentActivityCard({ dateRange = 30 }: RecentActivityCardProps) {
  const { activity, isLoading } = useDashboardData(dateRange);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'mailed': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'delivered': return <Mail className="h-4 w-4 text-green-500" />;
      case 'qr_scan': return <QrCode className="h-4 w-4 text-purple-500" />;
      case 'page_visit': return <MousePointer className="h-4 w-4 text-orange-500" />;
      case 'lead_form': return <User className="h-4 w-4 text-teal-500" />;
      case 'gift_card_claimed': return <Gift className="h-4 w-4 text-pink-500" />;
      default: return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest events across campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activity?.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
              <div className="mt-0.5">
              {getActivityIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.description}</p>
                <p className="text-xs text-muted-foreground truncate">{item.campaign_name}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </span>
            </div>
          ))}
          {!activity?.length && (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
