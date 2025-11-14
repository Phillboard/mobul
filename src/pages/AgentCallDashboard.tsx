import { useParams } from "react-router-dom";
import { useCallSession } from "@/hooks/useCallTracking";
import { Card } from "@/components/ui/card";
import { CallStatusBadge } from "@/components/agent/CallStatusBadge";
import { CallerInfoPanel } from "@/components/agent/CallerInfoPanel";
import { ConditionTriggers } from "@/components/agent/ConditionTriggers";
import { CallNotes } from "@/components/agent/CallNotes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AgentCallDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: callSession, isLoading, error, refetch } = useCallSession(sessionId || null);

  // Real-time updates for call status changes
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`call-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${sessionId}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading call session...</p>
        </div>
      </div>
    );
  }

  if (error || !callSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? "Failed to load call session" : "Call session not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Call Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Campaign: {callSession.campaigns?.name}
            </p>
          </div>
          <CallStatusBadge status={callSession.call_status} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Caller Info */}
          <div className="lg:col-span-1">
            <CallerInfoPanel callSession={callSession} />
          </div>

          {/* Right Column - Actions & Notes */}
          <div className="lg:col-span-2 space-y-6">
            <ConditionTriggers callSession={callSession} />
            <CallNotes callSession={callSession} />
          </div>
        </div>
      </div>
    </div>
  );
}
