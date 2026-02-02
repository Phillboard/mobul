import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle, XCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CustomerCodeBulkActionsProps {
  selectedRecipients: any[];
  onClearSelection: () => void;
}

export function CustomerCodeBulkActions({
  selectedRecipients,
  onClearSelection,
}: CustomerCodeBulkActionsProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const queryClient = useQueryClient();

  const bulkApproveMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const data = await callEdgeFunction<{ successCount: number; failedCount: number }>(
        Endpoints.callCenter.bulkApproveCodes,
        {
          recipientIds: selectedRecipients.map(r => r.id),
          action,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }
      );

      return data;
    },
    onSuccess: (data, action) => {
      toast.success(
        `${action === "approve" ? "Approved" : "Rejected"} ${data.successCount} codes`
      );
      if (data.failedCount > 0) {
        toast.error(`Failed to process ${data.failedCount} codes`);
      }
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      onClearSelection();
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(`Failed to process codes: ${error.message}`);
    },
  });

  const exportSelectedToCSV = () => {
    const headers = [
      "Code",
      "First Name",
      "Last Name",
      "Phone",
      "Email",
      "Status",
      "Created At",
    ];
    const rows = selectedRecipients.map((r) => [
      r.redemption_code,
      r.first_name || "",
      r.last_name || "",
      r.phone || "",
      r.email || "",
      r.status,
      new Date(r.created_at).toISOString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_codes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  if (selectedRecipients.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              {selectedRecipients.length} code{selectedRecipients.length !== 1 ? "s" : ""} selected
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear Selection
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Breakdown */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(
            selectedRecipients.reduce((acc: any, r) => {
              acc[r.status] = (acc[r.status] || 0) + 1;
              return acc;
            }, {})
          ).map(([status, count]) => (
            <Badge key={status} variant="secondary">
              {status}: {count as number}
            </Badge>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => bulkApproveMutation.mutate("approve")}
            disabled={bulkApproveMutation.isPending}
            className="flex-1"
          >
            {bulkApproveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve Selected
          </Button>

          <Button
            variant="outline"
            onClick={exportSelectedToCSV}
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Selected
          </Button>
        </div>

        {/* Rejection Section */}
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            rows={2}
          />
          <Button
            onClick={() => bulkApproveMutation.mutate("reject")}
            disabled={bulkApproveMutation.isPending}
            variant="destructive"
            className="w-full"
          >
            {bulkApproveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject Selected
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
