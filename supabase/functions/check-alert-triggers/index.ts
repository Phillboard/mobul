import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertThreshold {
  metric_type: string;
  threshold_value: number;
  comparison: "greater_than" | "less_than";
  time_window_minutes: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking alert triggers...");

    // Define alert thresholds
    const thresholds: AlertThreshold[] = [
      { metric_type: "api_response", threshold_value: 3000, comparison: "greater_than", time_window_minutes: 5 },
      { metric_type: "page_load", threshold_value: 5000, comparison: "greater_than", time_window_minutes: 5 },
      { metric_type: "database_query", threshold_value: 2000, comparison: "greater_than", time_window_minutes: 5 },
      { metric_type: "edge_function", threshold_value: 10000, comparison: "greater_than", time_window_minutes: 5 },
    ];

    const alerts: Array<{ title: string; message: string; severity: string; alert_type: string }> = [];

    // Check performance metrics
    for (const threshold of thresholds) {
      const timeAgo = new Date(Date.now() - threshold.time_window_minutes * 60 * 1000).toISOString();
      
      const { data: metrics, error } = await supabase
        .from("performance_metrics")
        .select("duration_ms")
        .eq("metric_type", threshold.metric_type)
        .gte("recorded_at", timeAgo);

      if (error) {
        console.error(`Error fetching metrics for ${threshold.metric_type}:`, error);
        continue;
      }

      if (metrics && metrics.length > 0) {
        const avgDuration = metrics.reduce((sum, m) => sum + m.duration_ms, 0) / metrics.length;
        
        if (avgDuration > threshold.threshold_value) {
          alerts.push({
            title: `High ${threshold.metric_type.replace("_", " ")} latency detected`,
            message: `Average ${threshold.metric_type} duration is ${Math.round(avgDuration)}ms (threshold: ${threshold.threshold_value}ms) over the last ${threshold.time_window_minutes} minutes`,
            severity: avgDuration > threshold.threshold_value * 1.5 ? "critical" : "warning",
            alert_type: "performance",
          });
        }
      }
    }

    // Check for high error rate
    const errorTimeAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentErrors, error: errorQueryError } = await supabase
      .from("error_logs")
      .select("id")
      .gte("occurred_at", errorTimeAgo)
      .eq("resolved", false);

    if (!errorQueryError && recentErrors && recentErrors.length > 10) {
      alerts.push({
        title: "High error rate detected",
        message: `${recentErrors.length} unresolved errors in the last 15 minutes`,
        severity: recentErrors.length > 20 ? "critical" : "warning",
        alert_type: "error_rate",
      });
    }

    // Create alerts in database
    if (alerts.length > 0) {
      console.log(`Creating ${alerts.length} alerts`);
      
      for (const alert of alerts) {
        // Check if similar alert already exists and is unresolved
        const { data: existingAlerts } = await supabase
          .from("system_alerts")
          .select("id")
          .eq("title", alert.title)
          .eq("resolved", false)
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Within last hour

        if (!existingAlerts || existingAlerts.length === 0) {
          const { error: insertError } = await supabase
            .from("system_alerts")
            .insert(alert);

          if (insertError) {
            console.error("Error creating alert:", insertError);
          } else {
            console.log(`Created alert: ${alert.title}`);
          }
        } else {
          console.log(`Skipping duplicate alert: ${alert.title}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alerts_checked: thresholds.length,
        alerts_created: alerts.length 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-alert-triggers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
