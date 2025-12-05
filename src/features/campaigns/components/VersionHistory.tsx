import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface VersionHistoryProps {
  campaignId: string;
}

export function VersionHistory({ campaignId }: VersionHistoryProps) {
  const { data: versions, isLoading } = useQuery({
    queryKey: ["campaign-versions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_versions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      
      // Fetch user details separately
      const userIds = [...new Set(data?.map(v => v.created_by_user_id) || [])];
      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      // Attach user data to versions
      return data?.map(version => ({
        ...version,
        user: users?.find(u => u.id === version.created_by_user_id)
      })) || [];
    },
  });

  const handleRestore = async (version: any) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update(version.snapshot_json)
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(`Restored to version ${version.version_number}`);
    } catch (error: any) {
      toast.error(`Failed to restore version: ${error.message}`);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campaign Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading versions...</p>
          )}

          {versions && versions.length === 0 && (
            <p className="text-sm text-muted-foreground">No versions saved yet</p>
          )}

          {versions?.map((version) => (
            <div
              key={version.id}
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      Version {version.version_number}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(version.created_at))} ago
                    </span>
                  </div>
                  
                  {version.change_description && (
                    <p className="text-sm mb-2">{version.change_description}</p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Created by {version.user?.full_name || version.user?.email || "Unknown"}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRestore(version)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
