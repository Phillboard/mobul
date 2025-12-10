import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from '@shared/hooks';
import { Search, CheckCircle, XCircle, Phone, Mail, User } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

interface CodeApprovalPanelProps {
  callSessionId?: string;
}

export function CodeApprovalPanel({ callSessionId }: CodeApprovalPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search recipients
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["recipient-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];

      let query = supabase
        .from("recipients")
        .select(`
          *,
          audience:audiences(name, client_id),
          call_session:call_sessions(id, campaign_id)
        `)
        .limit(10);

      // Search by code, phone, or name
      if (searchTerm.match(/^[A-Z0-9]+$/i)) {
        query = query.or(`redemption_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      } else {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 3,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ recipientId, action }: { recipientId: string; action: "approve" | "reject" }) => {
      const { data, error } = await supabase.functions.invoke("approve-customer-code", {
        body: {
          recipientId,
          action,
          callSessionId,
          notes,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipient-search"] });
      toast({
        title: variables.action === "approve" ? "Code Approved" : "Code Rejected",
        description: variables.action === "approve" 
          ? "Customer can now redeem their gift card"
          : "Code has been rejected",
      });
      setSelectedRecipient(null);
      setSearchTerm("");
      setNotes("");
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!selectedRecipient) return;
    approveMutation.mutate({ recipientId: selectedRecipient.id, action: "approve" });
  };

  const handleReject = () => {
    if (!selectedRecipient) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this code",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate({ recipientId: selectedRecipient.id, action: "reject" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      redeemed: "outline",
    };

    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verify & Approve Customer Code</CardTitle>
          <CardDescription>
            Search by redemption code, phone number, or customer name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search">Search Customer</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter code, phone, or name..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
          
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              {searchResults.map((recipient) => (
                <Card
                  key={recipient.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedRecipient?.id === recipient.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedRecipient(recipient)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {recipient.first_name} {recipient.last_name}
                          </span>
                          {getStatusBadge(recipient.approval_status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {recipient.phone || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {recipient.email || "N/A"}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-muted-foreground">
                          Code: {recipient.redemption_code}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchTerm.length >= 3 && searchResults?.length === 0 && (
            <Alert>
              <AlertDescription>No customers found matching your search.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Selected Recipient Actions */}
      {selectedRecipient && (
        <Card>
          <CardHeader>
            <CardTitle>Approve or Reject Code</CardTitle>
            <CardDescription>
              {selectedRecipient.first_name} {selectedRecipient.last_name} -{" "}
              {selectedRecipient.redemption_code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{selectedRecipient.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{selectedRecipient.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Current Status</p>
                <div className="mt-1">{getStatusBadge(selectedRecipient.approval_status)}</div>
              </div>
              <div>
                <p className="text-sm font-medium">Audience</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRecipient.audience?.name || "N/A"}
                </p>
              </div>
            </div>

            {/* Rejection Reason (only show if rejecting) */}
            <div>
              <Label htmlFor="rejection">Rejection Reason (if rejecting)</Label>
              <Textarea
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why is this code being rejected?"
                rows={2}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this approval..."
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={
                  approveMutation.isPending ||
                  selectedRecipient.approval_status === "redeemed"
                }
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Code
              </Button>
              <Button
                onClick={handleReject}
                disabled={
                  approveMutation.isPending ||
                  selectedRecipient.approval_status === "redeemed"
                }
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Code
              </Button>
            </div>

            {selectedRecipient.approval_status === "redeemed" && (
              <Alert>
                <AlertDescription>
                  This code has already been redeemed and cannot be modified.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
