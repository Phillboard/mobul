import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useCallAnalytics } from '@/features/call-center/hooks';
import { Phone, Clock, UserCheck, Users } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CallAnalyticsTabProps {
  campaignId: string;
}

export function CallAnalyticsTab({ campaignId }: CallAnalyticsTabProps) {
  const { data: analytics, isLoading } = useCallAnalytics(campaignId);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading call analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-4 text-muted-foreground">No call data available</div>;
  }

  const statusColors: Record<string, string> = {
    completed: "hsl(var(--chart-1))",
    in_progress: "hsl(var(--chart-2))",
    ringing: "hsl(var(--chart-3))",
    no_answer: "hsl(var(--chart-4))",
    busy: "hsl(var(--chart-5))",
  };

  const statusData = Object.entries(analytics.statusBreakdown).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    color: statusColors[status] || "hsl(var(--muted))",
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.answeredCalls} answered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(analytics.avgDuration / 60)}m {analytics.avgDuration % 60}s
            </div>
            <p className="text-xs text-muted-foreground">
              Per answered call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.answerRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.answeredCalls} of {analytics.totalCalls}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Match Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.matchRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.matchedCalls} matched
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Status Breakdown</CardTitle>
            <CardDescription>Distribution of call outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Volume Timeline</CardTitle>
            <CardDescription>Calls received over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))" 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Calls"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
