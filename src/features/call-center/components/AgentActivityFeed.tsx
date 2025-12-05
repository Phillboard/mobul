import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from '@core/auth/AuthProvider';

export function AgentActivityFeed() {
  const { user } = useAuth();

  // Fetch today's agent stats
  const { data: todayStats } = useQuery({
    queryKey: ["agent-stats-today", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("recipient_audit_log")
        .select("action")
        .eq("performed_by_user_id", user?.id)
        .gte("created_at", today.toISOString());

      if (error) throw error;

      const provisioned = data.filter(log => log.action === "redeemed").length;
      const approved = data.filter(log => log.action === "approved").length;

      return { provisioned, approved };
    },
    enabled: !!user?.id,
  });

  // Fetch recent redemptions by this agent
  const { data: recentActivity } = useQuery({
    queryKey: ["agent-recent-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipient_audit_log")
        .select(`
          *,
          recipient:recipients(redemption_code, first_name, last_name)
        `)
        .eq("performed_by_user_id", user?.id)
        .eq("action", "redeemed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Array<{
        id: string;
        created_at: string;
        action: string;
        recipient: {
          redemption_code: string;
          first_name: string;
          last_name: string;
        } | null;
      }>;
    },
    enabled: !!user?.id,
  });

  // Fetch pending approvals count
  const { data: pendingCount } = useQuery({
    queryKey: ["pending-approvals-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("recipients")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending");

      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="space-y-4">
      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todayStats?.provisioned || 0}</div>
                <div className="text-xs text-muted-foreground">Provisioned Today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todayStats?.approved || 0}</div>
                <div className="text-xs text-muted-foreground">Approved Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingCount && pendingCount > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {pendingCount}
                </div>
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  Pending Approvals
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((log: { id: string; created_at: string; recipient: { redemption_code: string; first_name: string; last_name: string } | null }) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">
                      {log.recipient?.first_name} {log.recipient?.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.recipient?.redemption_code}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "HH:mm")}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Badge */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">
              {todayStats ? todayStats.provisioned + todayStats.approved : 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Actions Today</div>
            {todayStats && (todayStats.provisioned + todayStats.approved) >= 10 && (
              <Badge className="mt-2" variant="default">
                High Performer 🌟
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
