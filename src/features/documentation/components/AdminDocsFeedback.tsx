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
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export function AdminDocsFeedback() {
  const { data: feedback } = useQuery({
    queryKey: ["documentation-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_feedback")
        .select(`
          *,
          documentation_pages (
            title,
            slug
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">User Feedback</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Page</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedback?.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.documentation_pages?.title}
              </TableCell>
              <TableCell>
                {item.is_helpful ? (
                  <Badge variant="default" className="bg-green-500">
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    Helpful
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Not Helpful
                  </Badge>
                )}
              </TableCell>
              <TableCell className="max-w-md">
                {item.feedback_text || <span className="text-muted-foreground">No comment</span>}
              </TableCell>
              <TableCell>
                {new Date(item.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
