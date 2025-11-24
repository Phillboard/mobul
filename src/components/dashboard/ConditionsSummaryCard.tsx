import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Zap className="h-5 w-5 mr-2 text-primary" />
          Campaign Conditions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {/* Total Conditions */}
          <div className="text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <Clock className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats?.totalConditions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Conditions</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {stats?.activeConditions || 0} active
            </Badge>
          </div>

          {/* 7-Day Triggers */}
          <div className="text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <TrendingUp className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{stats?.recentTriggers || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">7-Day Triggers</p>
            <p className="text-xs text-muted-foreground mt-1">Auto-triggered</p>
          </div>

          {/* Conditions Completed */}
          <div className="text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <CheckCircle2 className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{stats?.conditionsMet || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
            <p className="text-xs text-muted-foreground mt-1">Rewards sent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
