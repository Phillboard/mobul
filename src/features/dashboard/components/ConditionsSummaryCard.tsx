import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Zap, TrendingUp } from "lucide-react";

interface ConditionsSummaryCardProps {
  clientId: string;
}

export function ConditionsSummaryCard({ clientId }: ConditionsSummaryCardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['conditions-summary', clientId],
    queryFn: async () => {
      // Get active campaigns with conditions
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, campaign_conditions(id, trigger_type, is_active)')
        .eq('client_id', clientId)
        .in('status', ['draft', 'proofed', 'in_production', 'mailed']);

      if (campaignsError) throw campaignsError;

      const totalConditions = campaigns?.reduce(
        (sum, c) => sum + (c.campaign_conditions?.length || 0),
        0
      ) || 0;

      const activeConditions = campaigns?.reduce(
        (sum, c) => sum + (c.campaign_conditions?.filter((cond: any) => cond.is_active).length || 0),
        0
      ) || 0;

      // Get recent triggers from events
      const { count: recentTriggers } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'condition_triggered')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Get conditions met count
      const { count: conditionsMet } = await supabase
        .from('call_conditions_met')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalConditions,
        activeConditions,
        recentTriggers: recentTriggers || 0,
        conditionsMet: conditionsMet || 0,
      };
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2 text-primary" />
          Campaign Conditions
        </CardTitle>
        <CardDescription>
          Automated triggers and rewards performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Conditions */}
          <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Total Conditions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.totalConditions || 0}</p>
              <Badge variant="secondary" className="mt-1">
                {stats?.activeConditions || 0} active
              </Badge>
            </div>
          </div>

          {/* Recent Triggers */}
          <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">7-Day Triggers</p>
              <p className="text-2xl font-bold text-foreground">{stats?.recentTriggers || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-triggered events
              </p>
            </div>
          </div>

          {/* Conditions Met */}
          <div className="flex items-start space-x-3 p-4 border border-border rounded-lg col-span-2">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Conditions Completed (7 days)</p>
              <p className="text-2xl font-bold text-foreground">{stats?.conditionsMet || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rewards delivered to recipients
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
