/**
 * CampaignQuickActions Component
 * 
 * Dropdown menu with common actions for campaigns.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  BarChart3,
  FileDown,
  Send,
  Users,
  Loader2,
} from "lucide-react";
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
import { CloneCampaignDialog } from "./CloneCampaignDialog";

interface Campaign {
  id: string;
  name: string;
  status: string;
  client_id: string;
}

interface CampaignQuickActionsProps {
  campaign: Campaign;
  variant?: 'default' | 'icon';
}

export function CampaignQuickActions({ campaign, variant = 'default' }: CampaignQuickActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      toast({
        title: 'Status Updated',
        description: `Campaign status changed to ${newStatus.replace('_', ' ')}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Campaign Deleted',
        description: 'Campaign has been permanently removed',
      });
      navigate('/campaigns');
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const canActivate = ['draft', 'scheduled', 'paused'].includes(campaign.status);
  const canPause = ['active', 'in_progress', 'mailing'].includes(campaign.status);
  const canComplete = ['active'].includes(campaign.status);
  const canCancel = !['completed', 'cancelled'].includes(campaign.status);
  const canDelete = ['draft', 'cancelled'].includes(campaign.status);
  const canEdit = !['completed', 'cancelled'].includes(campaign.status);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === 'icon' ? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Actions
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Navigation Actions */}
          <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          
          {canEdit && (
            <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Campaign
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => navigate(`/campaigns/${campaign.id}/analytics`)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowCloneDialog(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Clone Campaign
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {/* Status Actions */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Change Status
          </DropdownMenuLabel>
          
          {canActivate && (
            <DropdownMenuItem 
              onClick={() => updateStatus.mutate('active')}
              disabled={updateStatus.isPending}
            >
              <Play className="h-4 w-4 mr-2 text-green-600" />
              Activate
            </DropdownMenuItem>
          )}
          
          {canPause && (
            <DropdownMenuItem 
              onClick={() => updateStatus.mutate('paused')}
              disabled={updateStatus.isPending}
            >
              <Pause className="h-4 w-4 mr-2 text-orange-600" />
              Pause
            </DropdownMenuItem>
          )}
          
          {canComplete && (
            <DropdownMenuItem 
              onClick={() => updateStatus.mutate('completed')}
              disabled={updateStatus.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              Mark Complete
            </DropdownMenuItem>
          )}
          
          {canCancel && (
            <DropdownMenuItem 
              onClick={() => updateStatus.mutate('cancelled')}
              disabled={updateStatus.isPending}
              className="text-orange-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Campaign
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          
          {/* Export Action */}
          <DropdownMenuItem onClick={() => {
            toast({
              title: 'Export Started',
              description: 'Your export will be ready shortly',
            });
          }}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Data
          </DropdownMenuItem>
          
          {/* Delete Action */}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clone Dialog */}
      <CloneCampaignDialog
        campaign={campaign}
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{campaign.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCampaign.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampaign.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

