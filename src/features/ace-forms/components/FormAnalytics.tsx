import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { supabase } from '@core/services/supabase';
import { BarChart3, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Progress } from "@/shared/components/ui/progress";

interface FormAnalyticsProps {
  formId: string;
}

interface AnalyticsData {
  views: number;
  submissions: number;
  completionRate: number;
}

export function FormAnalytics({ formId }: FormAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    views: 0,
    submissions: 0,
    completionRate: 0,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Conversion Funnel - Views to Completions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>Form views to completions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Viewed Form</span>
              <span className="font-medium">{analytics.views.toLocaleString()}</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Completed Form</span>
              <span className="font-medium">{analytics.submissions.toLocaleString()}</span>
            </div>
            <Progress 
              value={analytics.views > 0 ? (analytics.submissions / analytics.views) * 100 : 0} 
              className="h-2" 
            />
          </div>

          {analytics.views > 0 && analytics.submissions === 0 && (
            <p className="text-sm text-muted-foreground pt-2">
              No submissions yet. Share your form to start collecting data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
