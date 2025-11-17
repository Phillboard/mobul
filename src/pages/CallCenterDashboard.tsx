import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Gift, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CompleteCallDialog } from "@/components/agent/CompleteCallDialog";

export default function CallCenterDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null);

  // Fetch active call sessions
  const { data: activeCalls } = useQuery({
    queryKey: ['call-center-active-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          campaigns(name, client_id),
          recipients(first_name, last_name, phone)
        `)
        .eq('call_status', 'in-progress')
        .order('call_started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch conditions for selected call
  const { data: campaignConditions } = useQuery({
    queryKey: ['call-conditions', selectedCallId],
    enabled: !!selectedCallId,
    queryFn: async () => {
      if (!selectedCallId) return [];
      
      const call = activeCalls?.find(c => c.id === selectedCallId);
      if (!call) return [];

      const { data, error } = await supabase
        .from('campaign_conditions')
        .select('*')
        .eq('campaign_id', call.campaign_id)
        .eq('is_active', true)
        .order('condition_number');

      if (error) throw error;
      return data;
    }
  });

  // Mark condition as met mutation
  const markConditionMetMutation = useMutation({
    mutationFn: async ({ conditionNumber }: { conditionNumber: number }) => {
      if (!selectedCallId || !user) throw new Error("No call selected");
      
      const call = activeCalls?.find(c => c.id === selectedCallId);
      if (!call) throw new Error("Call not found");

      const { error } = await supabase
        .from('call_conditions_met')
        .insert({
          call_session_id: selectedCallId,
          campaign_id: call.campaign_id,
          recipient_id: call.recipient_id!,
          condition_number: conditionNumber,
          met_by_agent_id: user.id,
          notes: `Verified code: ${verificationCode}`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-center-active-calls'] });
      toast({
        title: "Condition marked as met",
        description: "Gift card will be sent automatically",
      });
      setVerificationCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark condition",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleMarkCondition = (conditionNumber: number) => {
    if (!verificationCode.trim()) {
      toast({
        title: "Verification code required",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }
    markConditionMetMutation.mutate({ conditionNumber });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Call Center Dashboard</h1>
          <p className="text-muted-foreground">Verify codes and release gift card rewards</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Active Calls
              </CardTitle>
              <CardDescription>Current in-progress call sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activeCalls?.map((call) => (
                  <div key={call.id} className="flex items-center gap-2">
                    <Button
                      variant={selectedCallId === call.id ? "default" : "outline"}
                      className="flex-1 justify-start"
                      onClick={() => setSelectedCallId(call.id)}
                    >
                      <div className="flex flex-col items-start flex-1">
                        <div className="font-semibold">
                          {call.recipients?.first_name} {call.recipients?.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {call.recipients?.phone} • {call.campaigns?.name}
                        </div>
                      </div>
                      <Badge variant={call.match_status === 'matched' ? 'default' : 'secondary'}>
                        {call.match_status}
                      </Badge>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSessionToComplete(call.id);
                        setCompleteDialogOpen(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!activeCalls || activeCalls.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active calls at the moment
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Verify & Release Reward
              </CardTitle>
              <CardDescription>
                {selectedCallId ? "Enter verification code to release gift card" : "Select a call to continue"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCallId ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter code from customer"
                      className="text-lg font-mono"
                    />
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="font-semibold mb-3">Available Conditions:</div>
                    {campaignConditions?.map((condition) => (
                      <Button
                        key={condition.id}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => handleMarkCondition(condition.condition_number)}
                        disabled={markConditionMetMutation.isPending || !verificationCode.trim()}
                      >
                        <span>{condition.condition_name}</span>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    ))}
                    {(!campaignConditions || campaignConditions.length === 0) && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No conditions available for this campaign
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an active call to verify and release rewards</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {sessionToComplete && (
        <CompleteCallDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          callSessionId={sessionToComplete}
          onComplete={() => {
            setSessionToComplete(null);
            queryClient.invalidateQueries({ queryKey: ['call-center-active-calls'] });
          }}
        />
      )}
    </Layout>
  );
}
