/**
 * Overview Tab Component
 * 
 * Role-specific dashboard showing aggregated stats and trends.
 * Admin sees platform-wide, Agency sees their org, Client sees their company.
 */

import { useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Gift, 
  Mail, 
  TrendingDown, 
  TrendingUp, 
  Users,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { useMonitoringOverview, useActiveAlerts } from '../../hooks';
import type { ActivityCategory } from '../../types/monitoring.types';

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-destructive',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantStyles[variant]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center text-xs ${
              trend === 'up' ? 'text-green-500' : 
              trend === 'down' ? 'text-red-500' : 
              'text-muted-foreground'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
               trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Category Colors
// ============================================================================

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  gift_card: '#10b981',
  campaign: '#3b82f6',
  communication: '#8b5cf6',
  api: '#f59e0b',
  user: '#ec4899',
  system: '#6b7280',
  billing: '#14b8a6',
};

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  gift_card: 'Gift Cards',
  campaign: 'Campaigns',
  communication: 'Communications',
  api: 'API',
  user: 'Users',
  system: 'System',
  billing: 'Billing',
};

// ============================================================================
// Main Component
// ============================================================================

interface OverviewTabProps {
  onNavigateToTab?: (tab: string) => void;
}

export function OverviewTab({ onNavigateToTab }: OverviewTabProps) {
  const { roles } = useAuth();
  const { currentOrg } = useTenant();
  const { data: overview, isLoading } = useMonitoringOverview();
  const { data: alerts } = useActiveAlerts({ limit: 5 });
  
  const isAdmin = roles.some(r => r.role === 'admin');
  const isAgencyOwner = roles.some(r => r.role === 'agency_owner');

  // Calculate trend percentage
  const todayVsYesterday = useMemo(() => {
    if (!overview) return null;
    const { today, yesterday } = overview;
    if (yesterday.total === 0) return null;
    const change = ((today.total - yesterday.total) / yesterday.total) * 100;
    return {
      direction: change >= 0 ? 'up' : 'down',
      value: `${Math.abs(change).toFixed(1)}%`,
    };
  }, [overview]);

  // Prepare pie chart data
  const categoryData = useMemo(() => {
    if (!overview?.byCategory) return [];
    return Object.entries(overview.byCategory)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        name: CATEGORY_LABELS[category as ActivityCategory] || category,
        value: count,
        color: CATEGORY_COLORS[category as ActivityCategory] || '#6b7280',
      }));
  }, [overview?.byCategory]);

  // Role-specific header
  const dashboardTitle = useMemo(() => {
    if (isAdmin) return 'Platform Overview';
    if (isAgencyOwner) return `${currentOrg?.name || 'Agency'} Overview`;
    return `${currentOrg?.name || 'Company'} Overview`;
  }, [isAdmin, isAgencyOwner, currentOrg?.name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">{dashboardTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin 
            ? 'Platform-wide activity and health metrics'
            : isAgencyOwner 
            ? 'Activity across all your clients'
            : 'Your company activity and metrics'
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Activity"
          value={overview?.today.total || 0}
          icon={Activity}
          trend={todayVsYesterday?.direction as 'up' | 'down' | undefined}
          trendValue={todayVsYesterday?.value}
          description="vs yesterday"
        />
        <StatCard
          title="Successful"
          value={overview?.today.success || 0}
          icon={CheckCircle2}
          variant="success"
          description={`${overview?.today.total ? Math.round((overview.today.success / overview.today.total) * 100) : 0}% success rate`}
        />
        <StatCard
          title="Failed"
          value={overview?.today.failed || 0}
          icon={AlertTriangle}
          variant={overview?.today.failed ? 'error' : 'default'}
          description="Require attention"
        />
        <StatCard
          title="This Month"
          value={overview?.thisMonth.total || 0}
          icon={Zap}
          description={`${overview?.thisWeek.total || 0} this week`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Trend</CardTitle>
            <CardDescription>Daily activity over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.trend && overview.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={overview.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Total"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="success" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    name="Success"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={false}
                    name="Failed"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Activity by Category</CardTitle>
            <CardDescription>Distribution of today's events</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={50}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      <span className="font-medium">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No activity today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Unresolved alerts requiring attention</CardDescription>
            </div>
            {onNavigateToTab && (
              <button 
                onClick={() => onNavigateToTab('alerts')}
                className="text-sm text-primary hover:underline"
              >
                View All
              </button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-destructive' :
                    alert.severity === 'warning' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{alert.title}</span>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' : 'secondary'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
