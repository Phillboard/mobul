import { LucideIcon, Send, Phone, Gift, Clock, Zap, BarChart3, List, TrendingUp, Users, Mail, Target, Sparkles } from 'lucide-react';
import { ComponentType } from 'react';

export interface DashboardWidget {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'kpi' | 'chart' | 'list' | 'actions' | 'summary';
  defaultSize: 'small' | 'medium' | 'large' | 'full';
  defaultEnabled: boolean;
  requiresClient: boolean;
  component: ComponentType<any>;
  props?: Record<string, any>;
}

// Import widget components
import { KPICard } from '@/components/dashboard/widgets/KPICard';
import { PerformanceChart } from '@/components/dashboard/widgets/PerformanceChart';
import { QuickActionsCard } from '@/components/dashboard/widgets/QuickActionsCard';
import { RecentCampaignsCard } from '@/components/dashboard/widgets/RecentCampaignsCard';
import { RecentActivityCard } from '@/components/dashboard/widgets/RecentActivityCard';
import { ConditionsSummaryCard } from '@/components/dashboard/ConditionsSummaryCard';
import { GiftCardSummaryCard } from '@/components/dashboard/GiftCardSummaryCard';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  // KPI Widgets
  {
    id: 'kpi-active-campaigns',
    name: 'Active Campaigns',
    description: 'Number of currently active campaigns',
    icon: Send,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Active Campaigns',
      icon: Send,
      color: 'text-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/10',
      dataKey: 'activeCampaigns',
    },
  },
  {
    id: 'kpi-active-calls',
    name: 'Active Calls Today',
    description: 'Number of calls received today',
    icon: Phone,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Active Calls Today',
      icon: Phone,
      color: 'text-green-600',
      bgGradient: 'from-green-500/10 to-green-600/10',
      dataKey: 'activeCallsToday',
    },
  },
  {
    id: 'kpi-gift-cards-delivered',
    name: 'Gift Cards Delivered',
    description: 'Total gift cards delivered',
    icon: Gift,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Gift Cards Delivered',
      icon: Gift,
      color: 'text-purple-600',
      bgGradient: 'from-purple-500/10 to-purple-600/10',
      dataKey: 'giftCardsDelivered',
    },
  },
  {
    id: 'kpi-avg-call-duration',
    name: 'Avg Call Duration',
    description: 'Average duration of calls',
    icon: Clock,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Avg Call Duration',
      icon: Clock,
      color: 'text-orange-600',
      bgGradient: 'from-orange-500/10 to-orange-600/10',
      dataKey: 'avgCallDuration',
    },
  },
  {
    id: 'kpi-condition-completion',
    name: 'Condition Completion Rate',
    description: 'Percentage of conditions met',
    icon: Target,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Condition Completion Rate',
      icon: Target,
      color: 'text-teal-600',
      bgGradient: 'from-teal-500/10 to-teal-600/10',
      dataKey: 'conditionCompletionRate',
    },
  },
  {
    id: 'kpi-total-recipients',
    name: 'Total Recipients',
    description: 'Total number of recipients',
    icon: Users,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Total Recipients',
      icon: Users,
      color: 'text-indigo-600',
      bgGradient: 'from-indigo-500/10 to-indigo-600/10',
      dataKey: 'totalRecipients',
    },
  },
  {
    id: 'kpi-delivery-rate',
    name: 'Delivery Rate',
    description: 'Mail delivery success rate',
    icon: Mail,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Delivery Rate',
      icon: Mail,
      color: 'text-cyan-600',
      bgGradient: 'from-cyan-500/10 to-cyan-600/10',
      dataKey: 'deliveryRate',
    },
  },
  {
    id: 'kpi-response-rate',
    name: 'Response Rate',
    description: 'Campaign response rate',
    icon: TrendingUp,
    category: 'kpi',
    defaultSize: 'small',
    defaultEnabled: true,
    requiresClient: true,
    component: KPICard,
    props: {
      title: 'Response Rate',
      icon: TrendingUp,
      color: 'text-pink-600',
      bgGradient: 'from-pink-500/10 to-pink-600/10',
      dataKey: 'responseRate',
    },
  },
  // Summary Cards
  {
    id: 'conditions-summary',
    name: 'Campaign Conditions',
    description: 'Automated triggers and rewards performance',
    icon: Zap,
    category: 'summary',
    defaultSize: 'large',
    defaultEnabled: true,
    requiresClient: true,
    component: ConditionsSummaryCard,
  },
  {
    id: 'gift-card-summary',
    name: 'Gift Card Inventory',
    description: 'Gift card pool status and deliveries',
    icon: Gift,
    category: 'summary',
    defaultSize: 'large',
    defaultEnabled: true,
    requiresClient: true,
    component: GiftCardSummaryCard,
  },
  {
    id: 'ai-insights',
    name: 'AI Insights',
    description: 'Personalized recommendations and insights',
    icon: Sparkles,
    category: 'summary',
    defaultSize: 'large',
    defaultEnabled: true,
    requiresClient: false,
    component: AIInsightsPanel,
  },
  // Chart Widget
  {
    id: 'chart-performance',
    name: 'Campaign Performance',
    description: 'Track mail delivery and engagement over time',
    icon: BarChart3,
    category: 'chart',
    defaultSize: 'large',
    defaultEnabled: true,
    requiresClient: true,
    component: PerformanceChart,
  },
  // Action Widget
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'Common tasks and shortcuts',
    icon: Zap,
    category: 'actions',
    defaultSize: 'medium',
    defaultEnabled: true,
    requiresClient: false,
    component: QuickActionsCard,
  },
  // List Widgets
  {
    id: 'recent-campaigns',
    name: 'Recent Campaigns',
    description: 'Your latest campaign activity',
    icon: List,
    category: 'list',
    defaultSize: 'full',
    defaultEnabled: true,
    requiresClient: true,
    component: RecentCampaignsCard,
  },
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Latest events across campaigns',
    icon: Clock,
    category: 'list',
    defaultSize: 'medium',
    defaultEnabled: true,
    requiresClient: true,
    component: RecentActivityCard,
  },
];

export const DEFAULT_WIDGET_LAYOUT = DASHBOARD_WIDGETS
  .filter(w => w.defaultEnabled)
  .map(w => w.id);
