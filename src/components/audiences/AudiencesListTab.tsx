import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface AudiencesListTabProps {
  clientId: string | null;
}

export function AudiencesListTab({ clientId }: AudiencesListTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteAudienceId, setDeleteAudienceId] = useState<string | null>(null);

  const { data: audiences, isLoading, refetch } = useQuery({
    queryKey: ['audiences', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const handleDelete = async () => {
    if (!deleteAudienceId) return;

    try {
      const { error } = await supabase
        .from('audiences')
        .delete()
        .eq('id', deleteAudienceId);

      if (error) throw error;

      toast({
        title: "Audience deleted",
        description: "The audience and all its recipients have been removed",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteAudienceId(null);
    }
  };

  const filteredAudiences = audiences?.filter(audience =>
    audience.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading audiences...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search audiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredAudiences.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No audiences yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Import your first contact list to get started
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAudiences.map((audience) => (
              <Card
                key={audience.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/audiences/${audience.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{audience.name}</h3>
                        <Badge variant={audience.status === 'ready' ? 'default' : 'secondary'}>
                          {audience.status}
                        </Badge>
                        <Badge variant="outline">{audience.source}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-6 text-sm text-muted-foreground">
                        <span>Total: {audience.total_count?.toLocaleString() || 0}</span>
                        <span>Valid: {audience.valid_count?.toLocaleString() || 0}</span>
                        <span>Invalid: {audience.invalid_count?.toLocaleString() || 0}</span>
                        <span>Created: {format(new Date(audience.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteAudienceId(audience.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteAudienceId} onOpenChange={() => setDeleteAudienceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audience</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the audience and all associated recipients. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
