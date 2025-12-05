import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface AnalyticsData {
  page: {
    title: string;
    slug: string;
    category: string;
  } | null;
  count: number;
}

export function AdminDocsAnalytics() {
  const { data: analytics } = useQuery<AnalyticsData[]>({
    queryKey: ["documentation-analytics"],
    queryFn: async (): Promise<AnalyticsData[]> => {
      const { data, error } = await supabase
        .from("documentation_views")
        .select(`
          page_id,
          documentation_pages (
            title,
            slug,
            category
          )
        `);

      if (error) throw error;

      const viewCounts = data.reduce((acc: Record<string, AnalyticsData>, view: any) => {
        const pageId = view.page_id;
        if (!acc[pageId]) {
          acc[pageId] = {
            page: view.documentation_pages,
            count: 0,
          };
        }
        acc[pageId].count++;
        return acc;
      }, {} as Record<string, AnalyticsData>);

      return (Object.values(viewCounts) as AnalyticsData[])
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    },
  });

  const totalViews = analytics?.reduce((sum, item) => sum + item.count, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Popular Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most Viewed Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.map((item: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{String(item.page?.title || "Unknown")}</TableCell>
                  <TableCell>{String(item.page?.category || "N/A")}</TableCell>
                  <TableCell>{item.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
