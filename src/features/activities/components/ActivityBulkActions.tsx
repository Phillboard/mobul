/**
 * Activity Bulk Actions Component
 * 
 * Provides bulk action controls for selected activities.
 */

import { useState } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { 
  ChevronDown, Download, Trash2, CheckSquare, 
  XSquare, Archive, RefreshCw, Loader2 
} from "lucide-react";
import { useToast } from "@shared/hooks";
import { Activity, useDeleteActivity } from '@/features/activities/hooks';

interface ActivityBulkActionsProps {
  selectedIds: string[];
  activities: Activity[];
  onClearSelection: () => void;
  onExport?: (format: 'csv' | 'json') => void;
}

export function ActivityBulkActions({
  selectedIds,
  activities,
  onClearSelection,
  onExport,
}: ActivityBulkActionsProps) {
  const { toast } = useToast();
  const deleteActivity = useDeleteActivity();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCount = selectedIds.length;
  const selectedActivities = activities.filter(a => selectedIds.includes(a.id));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete activities sequentially
      for (const id of selectedIds) {
        await deleteActivity.mutateAsync(id);
      }
      toast({
        title: 'Activities deleted',
        description: `${selectedCount} activities have been deleted.`,
      });
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Some activities could not be deleted.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (onExport) {
      onExport(format);
      return;
    }

    // Default export implementation
    const data = selectedActivities.map(a => ({
      id: a.id,
      type: a.activity_type,
      subject: a.subject,
      description: a.description,
      outcome: a.outcome,
      direction: a.direction,
      duration_minutes: a.duration_minutes,
      completed_at: a.completed_at,
      scheduled_at: a.scheduled_at,
      created_at: a.created_at,
    }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `activities-export-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => 
        Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = `activities-export-${Date.now()}.csv`;
      mimeType = 'text/csv';
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `${selectedCount} activities exported as ${format.toUpperCase()}.`,
    });
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <CheckSquare className="h-4 w-4" />
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear selection */}
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <XSquare className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} activities?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected activities will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ActivityBulkActions;
