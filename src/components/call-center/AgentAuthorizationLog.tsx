import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export function AgentAuthorizationLog() {
  const { user } = useAuth();

  const { data: authorizations, isLoading } = useQuery({
    queryKey: ["agent-authorizations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipient_audit_log")
        .select(`
          id,
          created_at,
          action,
          metadata,
          recipient:recipients(
            redemption_code,
            first_name,
            last_name,
            gift_card:gift_cards(card_value)
          )
        `)
        .eq("performed_by_user_id", user?.id)
        .in("action", ["redeemed", "gift_card_provisioned"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const todayCount = authorizations?.filter(a => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(a.created_at) >= today;
  }).length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Your Activity
          </CardTitle>
          <Badge variant="secondary">
            {todayCount} today
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading...
            </div>
          ) : authorizations && authorizations.length > 0 ? (
            authorizations.map((auth: any) => (
              <div key={auth.id} className="flex items-start justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="font-medium">
                      {auth.recipient?.first_name} {auth.recipient?.last_name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {auth.recipient?.redemption_code}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-primary">
                    ${auth.recipient?.gift_card?.card_value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(auth.created_at), "HH:mm")}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
