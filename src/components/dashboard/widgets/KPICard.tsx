import { Card } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCallStats } from '@/hooks/useCallStats';
import { useRewardSummary } from '@/hooks/useRewardSummary';
import { useConditionCompletionRate } from '@/hooks/useConditionCompletionRate';
import { useTenant } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface KPICardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  dataKey: string;
  dateRange?: number;
}

export function KPICard({ title, icon: Icon, color, dataKey, dateRange = 30 }: KPICardProps) {
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
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden p-6 border-border/50 bg-card hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full">
        {/* Floating Icon */}
        <div className={cn(
          'absolute -top-4 -right-4 p-8 rounded-full opacity-10',
          color
        )}>
          <Icon className="h-20 w-20" />
        </div>

        {/* Content */}
        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
              {title}
            </p>
            <div className={cn('p-2 rounded-lg', color, 'bg-opacity-10')}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              {value}
            </p>
            
            {change !== null && change !== undefined && (
              <Badge 
                variant={change >= 0 ? "default" : "destructive"} 
                className="gap-1 font-semibold"
              >
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(change)}%</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={cn('absolute bottom-0 left-0 right-0 h-1', color, 'opacity-50')} />
      </Card>
    </motion.div>
  );
}
