/**
 * Call Center Real-Time Metrics Dashboard
 * Phase 2.3: Operational visibility for call center
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function CallCenterMetrics() {
  // Today's redemption stats
  const { data: todayStats } = useQuery({
    queryKey: ["call-center-today-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: redemptions, error } = await supabase
        .from("gift_card_deliveries")
        .select("id, delivered_at, delivery_status")
        .eq("delivery_method", "call_center")
        .gte("created_at", today.toISOString());

      if (error) throw error;

      const successfulToday = redemptions?.filter(
        (r) => r.delivery_status === "delivered"
      ).length || 0;

      const totalToday = redemptions?.length || 0;

      return {
        totalRedemptions: totalToday,
        successfulRedemptions: successfulToday,
        successRate: totalToday > 0 ? ((successfulToday / totalToday) * 100).toFixed(1) : "0",
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["call-center-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_deliveries")
        .select(`
          id,
          delivered_at,
          delivery_status,
          recipient:recipients(first_name, last_name)
        `)
        .eq("delivery_method", "call_center")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Average call duration (last 100 calls)
  const { data: avgDuration } = useQuery({
    queryKey: ["call-center-avg-duration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_sessions")
        .select("call_duration_seconds")
        .not("call_duration_seconds", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const durations = data
        ?.map((d) => d.call_duration_seconds)
        .filter((d): d is number => d !== null) || [];

      if (durations.length === 0) return 0;

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      return Math.round(avg);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Redemptions per hour (last 24 hours)
  const { data: hourlyRate } = useQuery({
    queryKey: ["call-center-hourly-rate"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from("gift_card_deliveries")
        .select("id")
        .eq("delivery_method", "call_center")
        .gte("created_at", twentyFourHoursAgo.toISOString());

      if (error) throw error;

      return ((data?.length || 0) / 24).toFixed(1);
    },
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Today's Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayStats?.totalRedemptions || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {todayStats?.successRate}% success rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Hourly Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hourlyRate || "0"}</div>
            <div className="text-xs text-muted-foreground mt-1">redemptions/hour (24h avg)</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Avg Call Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {avgDuration ? `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, "0")}` : "0:00"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">minutes:seconds</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-purple-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {activity.recipient?.first_name} {activity.recipient?.last_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {activity.delivery_status === "delivered" && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    <span className="text-muted-foreground">
                      {activity.delivered_at && formatDistanceToNow(new Date(activity.delivered_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
          ⌨️ Keyboard Shortcuts
        </h4>
        <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <div><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded">Enter</kbd> Submit code</div>
          <div><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded">Esc</kbd> Clear form</div>
          <div><kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded">Ctrl/Cmd + C</kbd> Copy card details</div>
        </div>
      </div>
    </div>
  );
}
