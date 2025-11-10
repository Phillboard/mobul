import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export function AudiencesListTab() {
  const { currentClient } = useTenant();
  const navigate = useNavigate();

  const { data: audiences, isLoading } = useQuery({
    queryKey: ['audiences', currentClient?.id],
    queryFn: async () => {
      if (!currentClient) return [];
      
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentClient,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!currentClient) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Please select a client from the sidebar to view audiences
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!audiences || audiences.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No audiences yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Import your first contact list or purchase leads to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Valid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audiences.map((audience) => (
              <TableRow 
                key={audience.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/audiences/${audience.id}`)}
              >
                <TableCell className="font-medium">{audience.name}</TableCell>
                <TableCell className="capitalize">{audience.source}</TableCell>
                <TableCell className="text-right">{audience.total_count?.toLocaleString()}</TableCell>
                <TableCell className="text-right">{audience.valid_count?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(audience.status || 'unknown')}>
                    {audience.status || 'unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {audience.created_at ? format(new Date(audience.created_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/audiences/${audience.id}`);
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
