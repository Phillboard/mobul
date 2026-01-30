/**
 * OverviewTab Component
 * 
 * Dashboard view with recent activity across all types, quick stats, and activity charts.
 * Now displays real comparison percentages from the unified activity_log table.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Activity, Gift, Megaphone, Phone, Code, Users, 
  TrendingUp, TrendingDown, ArrowRight, Minus
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useActivityLogs, useActivityStats } from '../../hooks';
import { ActivityTable, createActivityColumns, StatusBadge } from '../ActivityTable';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { ActivityLog } from '../../types/activity.types';

interface OverviewTabProps {
  onNavigateToTab: (tab: string) => void;
}

export function OverviewTab({ onNavigateToTab }: OverviewTabProps) {
  const { data: stats, isLoading: statsLoading } = useActivityStats();
  const { data: recentActivity, isLoading: activityLoading } = useActivityLogs({
    pageSize: 10,
  });

  const categoryIcons = {
    gift_card: Gift,
    campaign: Megaphone,
    communication: Phone,
    api: Code,
    user: Users,
    system: Activity,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.today.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {!statsLoading && stats && (
                <>
                  {stats.percent_change_direction === 'up' && (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+{stats.percent_change}%</span>
                    </>
                  )}
                  {stats.percent_change_direction === 'down' && (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">-{stats.percent_change}%</span>
                    </>
                  )}
                  {stats.percent_change_direction === 'neutral' && (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground" />
                      <span>0%</span>
                    </>
                  )}
                  {' '}from yesterday
                </>
              )}
              {statsLoading && '...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.this_week.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.this_month.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total platform events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Activity by Category</CardTitle>
          <CardDescription>Distribution of events across different areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats && Object.entries(stats.by_category).map(([category, count]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons] || Activity;
              return (
                <button
                  key={category}
                  onClick={() => {
                    const tabMap: Record<string, string> = {
                      gift_card: 'gift-cards',
                      campaign: 'campaigns',
                      communication: 'communications',
                      api: 'api',
                      user: 'users',
                      system: 'system',
                    };
                    onNavigateToTab(tabMap[category] || 'overview');
                  }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{category.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{count} events today</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-500">
                  {statsLoading ? '...' : stats?.by_status.success.toLocaleString()}
                </p>
              </div>
              <Badge variant="default">Success</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">
                  {statsLoading ? '...' : stats?.by_status.failed.toLocaleString()}
                </p>
              </div>
              <Badge variant="destructive">Failed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {statsLoading ? '...' : stats?.by_status.pending.toLocaleString()}
                </p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest events across all categories</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={recentActivity?.data || []}
            columns={createActivityColumns()}
            isLoading={activityLoading}
            emptyMessage="No recent activity"
            emptyDescription="Platform activity will appear here in real-time."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default OverviewTab;
