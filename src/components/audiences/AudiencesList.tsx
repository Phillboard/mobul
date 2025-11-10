import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Eye, Trash2, Users as UsersIcon, Loader2 } from "lucide-react";
import { useAudiences, useDeleteAudience } from "@/hooks/useAudiences";
import { useTenant } from "@/contexts/TenantContext";
import { format } from "date-fns";

export function AudiencesList() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { data: audiences, isLoading } = useAudiences(currentClient?.id);
  const deleteAudience = useDeleteAudience();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getSourceBadge = (source: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      import: { label: 'Imported', variant: 'default' },
      purchase: { label: 'Purchased', variant: 'secondary' },
      manual: { label: 'Manual', variant: 'outline' },
    };
    return variants[source] || variants.manual;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      processing: 'secondary',
      ready: 'default',
      failed: 'destructive',
    };
    return variants[status] || 'default';
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAudience.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (!currentClient) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Please select a client from the sidebar to view audiences
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!audiences || audiences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Saved Audiences
          </CardTitle>
          <CardDescription>
            View and manage your segmented contact lists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Saved Audiences
          </CardTitle>
          <CardDescription>
            {audiences.length} {audiences.length === 1 ? 'audience' : 'audiences'} in {currentClient.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audiences.map((audience) => (
                <TableRow key={audience.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{audience.name}</TableCell>
                  <TableCell>
                    <Badge variant={getSourceBadge(audience.source).variant}>
                      {getSourceBadge(audience.source).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{audience.total_count.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{audience.valid_count.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(audience.status)}>
                      {audience.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(audience.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/audiences/${audience.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(audience.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audience?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this audience and all {audiences.find(a => a.id === deleteId)?.total_count.toLocaleString()} recipients.
              This action cannot be undone.
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
