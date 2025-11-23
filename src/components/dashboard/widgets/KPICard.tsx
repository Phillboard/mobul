import { Card } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCallStats } from '@/hooks/useCallStats';
import { useRewardSummary } from '@/hooks/useRewardSummary';
import { useConditionCompletionRate } from '@/hooks/useConditionCompletionRate';
import { useTenant } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  dataKey: string;
  dateRange?: number;
}

export function KPICard({ title, icon: Icon, color, bgGradient, dataKey, dateRange = 30 }: KPICardProps) {
  const { currentClient } = useTenant();
  const { stats } = useDashboardData(dateRange);
  const { data: callStats } = useCallStats(currentClient?.id);
  const { data: rewardSummary } = useRewardSummary(currentClient?.id);
  const { data: conditionRate } = useConditionCompletionRate(currentClient?.id);

  // Map dataKey to actual data
  const getKPIData = () => {
    switch (dataKey) {
      case 'activeCampaigns':
        return { value: stats?.activeCampaigns || 0, change: stats?.campaignTrend };
      case 'activeCallsToday':
        return { value: callStats?.activeCallsToday || 0, change: null };
      case 'giftCardsDelivered':
        return { value: rewardSummary?.totalDelivered || 0, change: null };
      case 'avgCallDuration':
        return { value: callStats?.avgCallDuration ? `${callStats.avgCallDuration}s` : '0s', change: null };
      case 'conditionCompletionRate':
        return { value: `${conditionRate?.completionRate || 0}%`, change: null };
      case 'totalRecipients':
        return { value: stats?.totalRecipients || 0, change: stats?.recipientTrend };
      case 'deliveryRate':
        return { value: `${stats?.deliveryRate || 0}%`, change: stats?.deliveryTrend };
      case 'responseRate':
        return { value: `${stats?.responseRate || 0}%`, change: stats?.responseTrend };
      default:
        return { value: 0, change: null };
    }
  };

  const { value, change } = getKPIData();

  return (
    <Card className={cn('p-6 transition-all hover:shadow-lg', `bg-gradient-to-br ${bgGradient}`)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">{value}</p>
            {change !== null && change !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                change >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className={cn('p-4 rounded-full', color, 'bg-background/50')}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
