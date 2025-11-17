import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { PlatformDashboard } from "./PlatformDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Send,
  Users,
  CheckCircle,
  MousePointerClick,
  Plus,
  Upload,
  BarChart3,
  ShoppingCart,
  Mail,
  QrCode,
  ExternalLink,
  Target,
  Clock,
  ArrowRight,
  Phone,
  Gift,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCallStats, useRewardSummary, useConditionCompletionRate } from "@/hooks/useCallAnalytics";
import { useNavigate } from "react-router-dom";
import { ConditionsSummaryCard } from "@/components/dashboard/ConditionsSummaryCard";
import { GiftCardSummaryCard } from "@/components/dashboard/GiftCardSummaryCard";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";

const Dashboard = () => {
  const { currentClient, isAdminMode } = useTenant();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(30);
  const { stats, performance, recentCampaigns, activity, isLoading } = useDashboardData(dateRange);
  
  // Import the new hooks
  const { data: callStats } = useCallStats(currentClient?.id || null, dateRange);
  const { data: rewardSummary } = useRewardSummary(currentClient?.id || null, dateRange);
  const { data: conditionRate } = useConditionCompletionRate(currentClient?.id || null, dateRange);

  // Show platform dashboard if admin in admin mode
  if (hasRole('admin') && isAdminMode) {
    return <PlatformDashboard />;
  }

  const kpiCards = [
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns || 0,
      change: stats?.campaignTrend || 0,
      icon: Send,
      color: "text-primary",
      bgGradient: "from-primary/10 via-primary/5 to-transparent",
    },
    {
      title: "Active Calls Today",
      value: callStats?.todayCalls || 0,
      change: 0,
      icon: Phone,
      color: "text-blue-600",
      bgGradient: "from-blue-600/10 via-blue-600/5 to-transparent",
    },
    {
      title: "Gift Cards Delivered",
      value: rewardSummary?.totalDelivered || 0,
      change: 0,
      icon: Gift,
      color: "text-purple-600",
      bgGradient: "from-purple-600/10 via-purple-600/5 to-transparent",
    },
    {
      title: "Avg Call Duration",
      value: callStats?.avgDuration ? `${Math.floor(callStats.avgDuration / 60)}m ${callStats.avgDuration % 60}s` : "0m 0s",
      change: 0,
      icon: Clock,
      color: "text-green-600",
      bgGradient: "from-green-600/10 via-green-600/5 to-transparent",
    },
    {
      title: "Condition Completion Rate",
      value: `${conditionRate?.completionRate.toFixed(1) || 0}%`,
      change: 0,
      icon: Target,
      color: "text-amber-600",
      bgGradient: "from-amber-600/10 via-amber-600/5 to-transparent",
    },
    {
      title: "Total Recipients",
      value: stats?.totalRecipients.toLocaleString() || "0",
      change: stats?.recipientTrend || 0,
      icon: Users,
      color: "text-purple-600",
      bgGradient: "from-purple-600/10 via-purple-600/5 to-transparent",
    },
    {
      title: "Delivery Rate",
      value: `${stats?.deliveryRate.toFixed(1) || 0}%`,
      change: stats?.deliveryTrend || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgGradient: "from-green-600/10 via-green-600/5 to-transparent",
    },
    {
      title: "Response Rate",
      value: `${stats?.responseRate.toFixed(1) || 0}%`,
      change: stats?.responseTrend || 0,
      icon: MousePointerClick,
      color: "text-amber-600",
      bgGradient: "from-amber-600/10 via-amber-600/5 to-transparent",
    },
  ];

  const quickActions = [
    {
      label: "Create Campaign",
      icon: Plus,
      onClick: () => navigate("/campaigns"),
      variant: "default" as const,
    },
    {
      label: "Import Audience",
      icon: Upload,
      onClick: () => navigate("/audiences"),
      variant: "outline" as const,
    },
    {
      label: "View Campaigns",
      icon: BarChart3,
      onClick: () => navigate("/campaigns"),
      variant: "outline" as const,
    },
    {
      label: "Purchase Leads",
      icon: ShoppingCart,
      onClick: () => navigate("/lead-marketplace"),
      variant: "outline" as const,
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      in_production: { variant: "default", label: "In Production" },
      mailed: { variant: "outline", label: "Mailed" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };

    const config = statusConfig[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "imb_injected":
        return <Mail className="h-4 w-4 text-primary" />;
      case "imb_delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "qr_scan":
        return <QrCode className="h-4 w-4 text-purple-600" />;
      case "purl_visit":
        return <ExternalLink className="h-4 w-4 text-amber-600" />;
      case "lead_captured":
        return <Target className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {currentClient ? `${currentClient.name} Overview` : "Welcome back"}
          </p>
        </div>
        <Tabs value={dateRange.toString()} onValueChange={(v) => setDateRange(Number(v))}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="7" className="text-xs sm:text-sm">7 Days</TabsTrigger>
            <TabsTrigger value="30" className="text-xs sm:text-sm">30 Days</TabsTrigger>
            <TabsTrigger value="90" className="text-xs sm:text-sm">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.slice(0, 4).map((kpi, index) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <Card key={index} variant="glass" hover="lift" className="relative overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bgGradient} pointer-events-none opacity-50 group-hover:opacity-70 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-foreground">{kpi.title}</CardTitle>
                <div className={`p-2 rounded-lg ${kpi.color.replace('text-', 'bg-')}/10 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative p-4 md:p-6 pt-0 md:pt-0">
                <div className="text-xl sm:text-2xl font-bold text-foreground">{kpi.value}</div>
                {kpi.change !== 0 && (
                  <p className={`text-xs flex items-center gap-1 mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">{Math.abs(kpi.change).toFixed(1)}% from last period</span>
                    <span className="sm:hidden">{Math.abs(kpi.change).toFixed(1)}%</span>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Second Row of KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.slice(4).map((kpi, index) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <Card key={index + 4} variant="glass" hover="lift" className="relative overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bgGradient} pointer-events-none opacity-50 group-hover:opacity-70 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-foreground">{kpi.title}</CardTitle>
                <div className={`p-2 rounded-lg ${kpi.color.replace('text-', 'bg-')}/10 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative p-4 md:p-6 pt-0 md:pt-0">
                <div className="text-xl sm:text-2xl font-bold text-foreground">{kpi.value}</div>
                {kpi.change !== 0 && (
                  <p className={`text-xs flex items-center gap-1 mt-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">{Math.abs(kpi.change).toFixed(1)}% from last period</span>
                    <span className="sm:hidden">{Math.abs(kpi.change).toFixed(1)}%</span>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Conditions Summary */}
      {currentClient && (
        <div className="space-y-6">
          <ConditionsSummaryCard clientId={currentClient.id} />
        </div>
      )}

      {/* Gift Card Summary */}
      {currentClient && (
        <div className="space-y-6">
          <GiftCardSummaryCard clientId={currentClient.id} />
        </div>
      )}

      {/* AI Insights Panel */}
      <AIInsightsPanel />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campaign Performance Chart */}
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>Track mail delivery and engagement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performance}>
                <defs>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorDelivered)"
                  name="Delivered"
                />
                <Area
                  type="monotone"
                  dataKey="qrScans"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorScans)"
                  name="QR Scans"
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorLeads)"
                  name="Leads"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant}
                  className="w-full justify-start gap-2 hover:shadow-glow-sm transition-all"
                  onClick={action.onClick}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest campaign activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/campaigns")} className="hover:shadow-glow-sm transition-all">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCampaigns?.map((campaign) => {
              const deliveryProgress = campaign.audience_count > 0 
                ? (campaign.delivered_count / campaign.audience_count) * 100 
                : 0;

              return (
                <div
                  key={campaign.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {campaign.audience_count.toLocaleString()} recipients
                        {campaign.mail_date && (
                          <>
                            <span>•</span>
                            <span>Mail: {new Date(campaign.mail_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Delivery Progress</span>
                      <span className="font-medium">{deliveryProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={deliveryProgress} className="h-2" />
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <QrCode className="h-3 w-3 text-purple-600" />
                      <span className="font-medium">{campaign.qr_scans}</span>
                      <span className="text-muted-foreground">scans</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-green-600" />
                      <span className="font-medium">{campaign.leads}</span>
                      <span className="text-muted-foreground">leads</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!recentCampaigns || recentCampaigns.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No campaigns yet. Create your first campaign to get started!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events across your campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity?.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="mt-1">{getActivityIcon(item.type)}</div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.campaign_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}

            {(!activity || activity.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
