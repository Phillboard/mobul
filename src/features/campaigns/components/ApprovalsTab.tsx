import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from '@shared/hooks';
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

interface ApprovalsTabProps {
  campaignId: string;
}

export function ApprovalsTab({ campaignId }: ApprovalsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["campaign-approvals", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_approvals")
        .select("*, user:profiles(full_name, email)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ approvalId, notes }: { approvalId: string; notes?: string }) => {
      const { error } = await supabase
        .from("campaign_approvals")
        .update({ status: "approved", notes })
        .eq("id", approvalId);

      if (error) throw error;

      // Send notification
      await callEdgeFunction(
        Endpoints.messaging.sendApprovalNotification,
        {
          approvalId,
          action: "approved",
          notes,
        }
      );
    },
    onSuccess: () => {
      toast({ title: "Campaign approved" });
      queryClient.invalidateQueries({ queryKey: ["campaign-approvals", campaignId] });
      setSelectedApproval(null);
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ approvalId, notes }: { approvalId: string; notes: string }) => {
      if (!notes.trim()) {
        throw new Error("Please provide a reason for rejection");
      }

      const { error } = await supabase
        .from("campaign_approvals")
        .update({ status: "rejected", notes })
        .eq("id", approvalId);

      if (error) throw error;

      await callEdgeFunction(
        Endpoints.messaging.sendApprovalNotification,
        {
          approvalId,
          action: "rejected",
          notes,
        }
      );
    },
    onSuccess: () => {
      toast({ title: "Campaign rejected", description: "Feedback sent to campaign owner" });
      queryClient.invalidateQueries({ queryKey: ["campaign-approvals", campaignId] });
      setSelectedApproval(null);
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async ({ approvalId, notes }: { approvalId: string; notes: string }) => {
      if (!notes.trim()) {
        throw new Error("Please describe the changes needed");
      }

      const { error } = await supabase
        .from("campaign_approvals")
        .update({ status: "changes_requested", notes })
        .eq("id", approvalId);

      if (error) throw error;

      await callEdgeFunction(
        Endpoints.messaging.sendApprovalNotification,
        {
          approvalId,
          action: "changes_requested",
          notes,
        }
      );
    },
    onSuccess: () => {
      toast({ title: "Changes requested", description: "Campaign owner has been notified" });
      queryClient.invalidateQueries({ queryKey: ["campaign-approvals", campaignId] });
      setSelectedApproval(null);
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to request changes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "changes_requested":
        return <MessageSquare className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      approved: "default",
      rejected: "destructive",
      changes_requested: "secondary",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading approvals...</div>;
  }

  if (!approvals || approvals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No approval requests yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Approval Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvals.filter((a) => a.status === "approved").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {approvals.filter((a) => a.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {approvals.filter((a) => a.status === "rejected").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvals.map((approval: any) => (
            <div
              key={approval.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all duration-200"
            >
              <div className="mt-1">{getStatusIcon(approval.status)}</div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {approval.user?.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {approval.user?.full_name || "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {approval.user?.email}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(approval.status)}
                </div>

                {approval.notes && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      {approval.notes}
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                </p>

                {approval.status === "pending" && (
                  <div className="space-y-3 pt-2">
                    {selectedApproval === approval.id ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add a comment (optional for approval, required for rejection)"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ approvalId: approval.id, notes: comment })}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => requestChangesMutation.mutate({ approvalId: approval.id, notes: comment })}
                            disabled={requestChangesMutation.isPending || !comment.trim()}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Request Changes
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({ approvalId: approval.id, notes: comment })}
                            disabled={rejectMutation.isPending || !comment.trim()}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedApproval(null);
                              setComment("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApproval(approval.id)}
                      >
                        Take Action
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
