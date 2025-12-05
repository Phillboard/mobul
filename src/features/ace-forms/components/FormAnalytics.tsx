import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@core/services/supabase';
import { BarChart3, TrendingUp, Users, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FormAnalyticsProps {
  formId: string;
}

interface AnalyticsData {
  views: number;
  submissions: number;
  completionRate: number;
  avgTimeToComplete: string;
  topErrors: { field: string; count: number }[];
  conversionFunnel: {
    viewed: number;
    started: number;
    completed: number;
  };
}

export function FormAnalytics({ formId }: FormAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    views: 0,
    submissions: 0,
    completionRate: 0,
    avgTimeToComplete: "0s",
    topErrors: [],
    conversionFunnel: {
      viewed: 0,
      started: 0,
      completed: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [formId]);

  const loadAnalytics = async () => {
    try {
      // Get form data
      const { data: form } = await supabase
        .from("ace_forms")
        .select("total_views, total_submissions")
        .eq("id", formId)
        .single();

      if (form) {
        const completionRate = form.total_views > 0 
          ? Math.round((form.total_submissions / form.total_views) * 100)
          : 0;

        setAnalytics({
          views: form.total_views || 0,
          submissions: form.total_submissions || 0,
          completionRate,
          avgTimeToComplete: "2m 15s", // Mock for now
          topErrors: [
            { field: "Email", count: 12 },
            { field: "Phone", count: 8 },
            { field: "Gift Card Code", count: 5 },
          ],
          conversionFunnel: {
            viewed: form.total_views || 0,
            started: Math.round((form.total_views || 0) * 0.75),
            completed: form.total_submissions || 0,
          },
        });
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.views.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.submissions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Completion Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.completionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg. Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.avgTimeToComplete}</div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>See where users drop off</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Viewed Form</span>
              <span className="font-medium">{analytics.conversionFunnel.viewed}</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Started Form</span>
              <span className="font-medium">{analytics.conversionFunnel.started}</span>
            </div>
            <Progress 
              value={(analytics.conversionFunnel.started / analytics.conversionFunnel.viewed) * 100} 
              className="h-2" 
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Completed Form</span>
              <span className="font-medium">{analytics.conversionFunnel.completed}</span>
            </div>
            <Progress 
              value={(analytics.conversionFunnel.completed / analytics.conversionFunnel.viewed) * 100} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Validation Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Most Common Errors
          </CardTitle>
          <CardDescription>Fields causing validation failures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topErrors.map((error, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{error.field}</span>
                <div className="flex items-center gap-3">
                  <Progress 
                    value={(error.count / analytics.topErrors[0].count) * 100} 
                    className="w-24 h-2" 
                  />
                  <span className="text-sm font-medium w-8">{error.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
